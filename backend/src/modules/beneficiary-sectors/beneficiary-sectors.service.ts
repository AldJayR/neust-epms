import { and, asc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { beneficiarySectors } from "@/db/schema/beneficiary-sectors.js";
import { proposalBeneficiaries } from "@/db/schema/proposal-beneficiaries.js";
import {
	normalizedSectorKey,
	normalizedSectorLabel,
} from "@/db/sector-normalization.js";
import { ApiError } from "@/lib/errors.js";
import type { SectorSelection } from "./beneficiary-sectors.schema.js";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function sectorKey(value: string) {
	return normalizedSectorKey(sql`${value}::text`);
}

type SectorInput = {
	sectors?: SectorSelection[] | undefined;
	sectorIds?: number[] | undefined;
	sectorNames?: string[] | undefined;
};

/** Resolve explicit selections and legacy requests through the same identity rules. */
async function resolveSectors(tx: Transaction, input: SectorInput) {
	const selections: SectorSelection[] = [
		...(input.sectors ?? []),
		...(input.sectorNames ?? []).map((sectorName) => ({ sectorName })),
	];
	const ids = [
		...new Set([
			...(input.sectorIds ?? []),
			...selections.flatMap((selection) =>
				selection.sectorId ? [selection.sectorId] : [],
			),
		]),
	];
	const rows = ids.length
		? await tx
				.select()
				.from(beneficiarySectors)
				.where(inArray(beneficiarySectors.sectorId, ids))
		: [];
	if (rows.length !== ids.length) {
		throw new ApiError(
			400,
			"INVALID_SECTORS",
			"One or more selected beneficiary sectors are invalid.",
		);
	}
	const byId = new Map(rows.map((row) => [row.sectorId, row]));
	const resolved = new Map<number, Set<string>>();
	const add = (sectorId: number, labels: string[]) => {
		const originals = resolved.get(sectorId) ?? new Set<string>();
		for (const label of labels) originals.add(label);
		resolved.set(sectorId, originals);
	};
	for (const sectorId of input.sectorIds ?? []) {
		const row = byId.get(sectorId)!;
		add(row.mergedIntoId ?? row.sectorId, [row.sectorName]);
	}

	// Consistent acquisition order reduces deadlocks for concurrent multi-sector saves.
	for (const selection of selections.sort((a, b) =>
		a.sectorName
			.trim()
			.replace(/\s+/g, " ")
			.toLowerCase()
			.localeCompare(b.sectorName.trim().replace(/\s+/g, " ").toLowerCase()),
	)) {
		const name = selection.sectorName;
		if (!name.trim() || [...name].length > 255) {
			throw new ApiError(
				400,
				"INVALID_SECTORS",
				"Sector names must contain 1–255 characters.",
			);
		}
		const originals = selection.enteredLabels?.length
			? selection.enteredLabels
			: [selection.sectorName];
		if (selection.sectorId) {
			const row = byId.get(selection.sectorId)!;
			add(row.mergedIntoId ?? row.sectorId, originals);
			continue;
		}
		const predicate = and(
			eq(beneficiarySectors.normalizedKey, sectorKey(name)),
			isNull(beneficiarySectors.mergedIntoId),
		);
		let [sector] = await tx
			.select({ sectorId: beneficiarySectors.sectorId })
			.from(beneficiarySectors)
			.where(predicate)
			.limit(1);
		if (!sector) {
			[sector] = await tx
				.insert(beneficiarySectors)
				.values({ sectorName: normalizedSectorLabel(sql`${name}::text`) })
				.onConflictDoNothing()
				.returning({ sectorId: beneficiarySectors.sectorId });
			// A concurrent insert can win. Re-read after ON CONFLICT waited for it.
			if (!sector)
				[sector] = await tx
					.select({ sectorId: beneficiarySectors.sectorId })
					.from(beneficiarySectors)
					.where(predicate)
					.limit(1);
		}
		if (!sector)
			throw new ApiError(
				409,
				"SECTOR_CONFLICT",
				"Beneficiary sectors changed. Please save again.",
			);
		add(sector.sectorId, originals);
	}
	return resolved;
}

export async function synchronizeProposalSectors(
	tx: Transaction,
	proposalId: string,
	input: SectorInput,
) {
	const resolved = await resolveSectors(tx, input);
	const sectorIds = [...resolved.keys()];
	await tx
		.update(proposalBeneficiaries)
		.set({ archivedAt: new Date() })
		.where(
			and(
				eq(proposalBeneficiaries.proposalId, proposalId),
				isNull(proposalBeneficiaries.archivedAt),
				...(sectorIds.length
					? [notInArray(proposalBeneficiaries.sectorId, sectorIds)]
					: []),
			),
		);
	for (const [sectorId, labels] of resolved) {
		const enteredLabels = [...labels];
		await tx
			.insert(proposalBeneficiaries)
			.values({ proposalId, sectorId, enteredLabels })
			.onConflictDoUpdate({
				target: [
					proposalBeneficiaries.proposalId,
					proposalBeneficiaries.sectorId,
				],
				set: {
					archivedAt: null,
					// Keep migrated wording even when an older client sends only canonical names.
					enteredLabels: sql`ARRAY(SELECT DISTINCT label FROM unnest(${proposalBeneficiaries.enteredLabels} || excluded.entered_labels) AS originals(label) ORDER BY label)`,
				},
			});
	}
}

// Supabase may install extensions under `extensions`, other hosts under `public`.
// Discover the namespace instead of moving the extension or changing pool settings.
let trigramSchema: string | undefined;
async function getTrigramSchema() {
	if (!trigramSchema) {
		const [extension] = await db.execute<{ schema: string }>(sql`
			SELECT n.nspname AS schema FROM pg_extension e
			JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_trgm'
		`);
		if (!extension)
			throw new ApiError(
				503,
				"SECTOR_SEARCH_UNAVAILABLE",
				"Sector search is not configured yet. You can still add sectors.",
			);
		trigramSchema = extension.schema;
	}
	return sql.identifier(trigramSchema);
}

export async function searchSectors(query: string) {
	const active = isNull(beneficiarySectors.mergedIntoId);
	if (!query.trim()) {
		const rows = await db
			.select({
				sectorId: beneficiarySectors.sectorId,
				sectorName: beneficiarySectors.sectorName,
			})
			.from(beneficiarySectors)
			.where(active)
			.orderBy(
				asc(beneficiarySectors.sectorName),
				asc(beneficiarySectors.sectorId),
			)
			.limit(10);
		return { items: rows.map((row) => ({ ...row, isExact: false })) };
	}
	const key = sectorKey(query);
	const column = beneficiarySectors.normalizedKey;
	const exact = sql<boolean>`${column} = ${key}`;
	const prefix = sql<boolean>`${column} LIKE ${sectorKey(query.replace(/[\\%_]/g, "\\$&"))} || '%' ESCAPE '\\'`;
	// Trigrams are a suggestion mechanism, never an identity/merge rule.
	const namespace =
		[...query.trim()].length >= 3 ? await getTrigramSchema() : null;
	const fuzzy = namespace
		? sql`${column} OPERATOR(${namespace}.%) ${key} OR ${key} OPERATOR(${namespace}.<%) ${column}`
		: sql`false`;
	const score = namespace
		? sql`greatest(${namespace}.similarity(${column}, ${key}), ${namespace}.word_similarity(${key}, ${column}))`
		: sql`0::real`;
	const items = await db
		.select({
			sectorId: beneficiarySectors.sectorId,
			sectorName: beneficiarySectors.sectorName,
			isExact: exact,
		})
		.from(beneficiarySectors)
		.where(and(active, sql`(${exact} OR ${prefix} OR ${fuzzy})`))
		.orderBy(
			sql`CASE WHEN ${exact} THEN 0 WHEN ${prefix} THEN 1 ELSE 2 END`,
			sql`${score} DESC`,
			asc(beneficiarySectors.sectorName),
			asc(beneficiarySectors.sectorId),
		)
		.limit(10);
	return { items };
}
