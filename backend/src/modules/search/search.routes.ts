import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client.js";
import { moas } from "@/db/schema/moas.js";
import { partners } from "@/db/schema/partners.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { proposals } from "@/db/schema/proposals.js";
import { users } from "@/db/schema/users.js";
import { ApiError, installApiErrorHandler } from "@/lib/errors.js";
import { ROLE_NAMES, type AuthUser } from "@/lib/types.js";
import type { AuthEnv } from "@/middleware/auth.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

const SEARCH_TYPE = z
	.enum(["all", "proposals", "projects", "reports", "moas", "users"])
	.default("all");

const SearchQuerySchema = z.object({
	q: z.string().trim().min(1).max(100).openapi({
		param: { name: "q", in: "query" },
		description: "Free-text search term",
	}),
	type: SEARCH_TYPE.openapi({
		param: { name: "type", in: "query" },
		description: "Entity type to search (default: all)",
	}),
	limit: z.coerce.number().int().min(1).max(20).default(5).openapi({
		param: { name: "limit", in: "query" },
		description: "Max results per entity type",
	}),
});

const SearchResultItemSchema = z.object({
	type: z.enum(["proposals", "projects", "reports", "moas", "users"]),
	id: z.string().uuid(),
	title: z.string(),
	subtitle: z.string().nullable(),
});

const SearchResponseSchema = z.object({
	results: z.array(SearchResultItemSchema),
});

type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

type SearchKind = z.infer<typeof SEARCH_TYPE>;

/**
 * Builds a safe prefix tsquery string from raw user input.
 * - Strips tsquery special characters to avoid syntax errors / injection.
 * - Uses the `simple` config (no stemming) so acronyms like EPMS/MOA survive.
 * - Appends `:*` to each token for substring-like prefix matching.
 */
function buildTsQuery(raw: string): string {
	const tokens = raw
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.map((t) => t.trim())
		.filter(Boolean)
		.slice(0, 10);
	if (tokens.length === 0) {
		throw new ApiError(400, "BAD_REQUEST", "Search term contains no searchable tokens");
	}
	return tokens.map((t) => `${t}:*`).join(" & ");
}

/** Role-based scoping conditions applied to the `proposals` table. */
function proposalScope(user: AuthUser): SQL[] {
	const conditions: SQL[] = [isNull(proposals.archivedAt)];
	if (user.roleName === ROLE_NAMES.FACULTY) {
		conditions.push(
			user.departmentId !== null
				? eq(proposals.departmentId, user.departmentId)
				: eq(proposals.campusId, user.campusId),
		);
	} else if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		conditions.push(
			user.isMainCampus && user.departmentId !== null
				? eq(proposals.departmentId, user.departmentId)
				: eq(proposals.campusId, user.campusId),
		);
	}
	return conditions;
}

const getSearchRoute = createRoute({
	method: "get",
	path: "/search",
	tags: ["Search"],
	summary: "Global full-text search across entities",
	security: [{ Bearer: [] }],
	request: { query: SearchQuerySchema },
	responses: {
		200: {
			content: { "application/json": { schema: SearchResponseSchema } },
			description: "Search results grouped by entity type",
		},
	},
});

app.openapi(getSearchRoute, async (c) => {
	const { q, type, limit } = c.req.valid("query");
	const user = c.get("user");
	const tsQuery = buildTsQuery(q);

	const canSearchMoas =
		user.roleName === ROLE_NAMES.RET_CHAIR || user.roleName === ROLE_NAMES.DIRECTOR;
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
						...proposalScope(user),
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
						...proposalScope(user),
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
						...proposalScope(user),
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
					title: sql`concat(${users.firstName}, ' ', ${users.lastName})`.as("title"),
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

	return c.json({ results }, 200);
});

export default app;
