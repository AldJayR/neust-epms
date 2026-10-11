/** Read-only pre-migration report. Run with: node --import tsx scripts/audit-beneficiary-sectors.ts */
import "dotenv/config";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = postgres(process.env.DATABASE_URL, {
	prepare: false,
	max: 1,
	connect_timeout: 15,
});

try {
	await client.begin("read only", async (tx) => {
		const extension = await tx`
			SELECT n.nspname AS schema FROM pg_extension e
			JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_trgm'
		`;
		const sectors = await tx`
			SELECT s.sector_id, s.sector_name,
				lower(btrim(regexp_replace(s.sector_name, '[[:space:]]+', ' ', 'g'))) AS normalized_key,
				count(pb.proposal_id)::int AS links,
				count(pb.proposal_id) FILTER (WHERE pb.archived_at IS NULL)::int AS active_links
			FROM beneficiary_sectors s LEFT JOIN proposal_beneficiaries pb ON pb.sector_id = s.sector_id
			GROUP BY s.sector_id ORDER BY normalized_key, s.sector_id
		`;
		const collisions = await tx`
			WITH normalized AS (
				SELECT sector_id, sector_name, lower(btrim(regexp_replace(sector_name, '[[:space:]]+', ' ', 'g'))) AS key
				FROM beneficiary_sectors
			)
			SELECT key, array_agg(sector_id ORDER BY sector_id) AS ids,
				array_agg(sector_name ORDER BY sector_id) AS names
			FROM normalized GROUP BY key HAVING count(*) > 1 ORDER BY key
		`;
		const overlappingLinks = await tx`
			SELECT pb.proposal_id,
				lower(btrim(regexp_replace(s.sector_name, '[[:space:]]+', ' ', 'g'))) AS key,
				count(*)::int AS links, bool_or(pb.archived_at IS NULL) AS has_active_link
			FROM proposal_beneficiaries pb JOIN beneficiary_sectors s ON s.sector_id = pb.sector_id
			GROUP BY pb.proposal_id, key HAVING count(*) > 1 ORDER BY pb.proposal_id, key
		`;
		console.log(
			JSON.stringify(
				{ pgTrgm: extension, sectors, collisions, overlappingLinks },
				null,
				2,
			),
		);
	});
} finally {
	await client.end({ timeout: 5 });
}
