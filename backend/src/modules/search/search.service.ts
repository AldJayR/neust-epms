import { and, eq, isNull, type SQL, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { moas } from "@/db/schema/moas.js";
import { partners } from "@/db/schema/partners.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { proposals } from "@/db/schema/proposals.js";
import { users } from "@/db/schema/users.js";
import { ApiError } from "@/lib/errors.js";
import { buildProposalScope } from "@/lib/scope-helpers.js";
import { type AuthUser, ROLE_NAMES } from "@/lib/types.js";
import type { SearchKind, SearchResultItem } from "./search.schema.js";

/**
 * Builds a safe prefix tsquery string from raw user input.
 * - Strips tsquery special characters to avoid syntax errors / injection.
 * - Uses the `simple` config (no stemming) so acronyms like EPMS/MOA survive.
 * - Appends `:*` to each token for substring-like prefix matching.
 */
export function buildTsQuery(raw: string): string {
	const tokens = raw
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.map((t) => t.trim())
		.filter(Boolean)
		.slice(0, 10);
	if (tokens.length === 0) {
		throw new ApiError(
			400,
			"BAD_REQUEST",
			"Search term contains no searchable tokens",
		);
	}
	return tokens.map((t) => `${t}:*`).join(" & ");
}

export async function searchEntities(
	user: AuthUser,
	query: { q: string; type: SearchKind; limit: number },
): Promise<{ results: SearchResultItem[] }> {
	const { q, type, limit } = query;
	const tsQuery = buildTsQuery(q);

	const canSearchMoas =
		user.roleName === ROLE_NAMES.RET_CHAIR ||
		user.roleName === ROLE_NAMES.DIRECTOR;
	const canSearchUsers = user.roleName === ROLE_NAMES.SUPER_ADMIN;

	const rank = (vector: SQL) =>
		sql`ts_rank(${vector}, to_tsquery('simple', ${tsQuery})) desc`;

	const queries: Promise<SearchResultItem[]>[] = [];

	const wants = (t: SearchKind) => type === "all" || type === t;

	if (wants("proposals")) {
		queries.push(
			db
				.select({
					type: sql`'proposals'`.as("type"),
					id: proposals.proposalId,
					title: proposals.title,
					subtitle: proposals.status,
				})
				.from(proposals)
				.where(
					and(
						...buildProposalScope(user),
						sql`to_tsvector('simple', ${proposals.title}) @@ to_tsquery('simple', ${tsQuery})`,
					),
				)
				.orderBy(rank(sql`to_tsvector('simple', ${proposals.title})`))
				.limit(limit)
				.then((rows) => rows as SearchResultItem[]),
		);
	}

	if (wants("projects")) {
		queries.push(
			db
				.select({
					type: sql`'projects'`.as("type"),
					id: projects.projectId,
					title: proposals.title,
					subtitle: projects.projectStatus,
				})
				.from(projects)
				.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
				.where(
					and(
						isNull(projects.archivedAt),
						...buildProposalScope(user),
						sql`to_tsvector('simple', ${proposals.title}) @@ to_tsquery('simple', ${tsQuery})`,
					),
				)
				.orderBy(rank(sql`to_tsvector('simple', ${proposals.title})`))
				.limit(limit)
				.then((rows) => rows as SearchResultItem[]),
		);
	}

	if (wants("reports")) {
		queries.push(
			db
				.select({
					type: sql`'reports'`.as("type"),
					id: projects.projectId,
					title: proposals.title,
					subtitle: projectReports.reportType,
				})
				.from(projectReports)
				.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
				.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
				.where(
					and(
						isNull(projectReports.archivedAt),
						...buildProposalScope(user),
						sql`to_tsvector('simple', ${proposals.title}) @@ to_tsquery('simple', ${tsQuery})`,
					),
				)
				.orderBy(rank(sql`to_tsvector('simple', ${proposals.title})`))
				.limit(limit)
				.then((rows) => rows as SearchResultItem[]),
		);
	}

	if (wants("moas") && canSearchMoas) {
		queries.push(
			db
				.select({
					type: sql`'moas'`.as("type"),
					id: moas.moaId,
					title: partners.partnerName,
					subtitle: partners.partnerType,
				})
				.from(moas)
				.innerJoin(partners, eq(moas.partnerId, partners.partnerId))
				.where(
					and(
						isNull(moas.archivedAt),
						sql`to_tsvector('simple', ${partners.partnerName}) @@ to_tsquery('simple', ${tsQuery})`,
					),
				)
				.orderBy(rank(sql`to_tsvector('simple', ${partners.partnerName})`))
				.limit(limit)
				.then((rows) => rows as SearchResultItem[]),
		);
	}

	if (wants("users") && canSearchUsers) {
		queries.push(
			db
				.select({
					type: sql`'users'`.as("type"),
					id: users.userId,
					title: sql`concat(${users.firstName}, ' ', ${users.lastName})`.as(
						"title",
					),
					subtitle: users.email,
				})
				.from(users)
				.where(
					sql`to_tsvector('simple', ${users.firstName} || ' ' || ${users.lastName} || ' ' || ${users.email}) @@ to_tsquery('simple', ${tsQuery})`,
				)
				.orderBy(
					rank(
						sql`to_tsvector('simple', ${users.firstName} || ' ' || ${users.lastName} || ' ' || ${users.email})`,
					),
				)
				.limit(limit)
				.then((rows) => rows as SearchResultItem[]),
		);
	}

	const nested = await Promise.all(queries);
	const results = nested.flat();

	return { results };
}
