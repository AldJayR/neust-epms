import { and, eq, type SQL, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposals } from "@/db/schema/proposals.js";
import { ApiError } from "@/lib/errors.js";
import {
	ACTIVE_EXTENSION_PROJECT_STATUSES,
	getActiveInvolvementSubquery,
} from "@/lib/faculty-involvement.js";
import { type AuthUser, ROLE_NAMES } from "@/lib/types.js";
import {
	type AnalyticsFilters,
	AnalyticsItem,
	AnalyticsResponse,
	type AnalyticsView,
} from "./analytics.schema.js";
import { csvCell } from "./analytics-csv.js";

/** All fragments are server-owned SQL. Request values are bound parameters. */
export function analyticsScope(user: AuthUser): SQL {
	if (user.roleName === ROLE_NAMES.DIRECTOR) return sql`true`;
	if (user.roleName === ROLE_NAMES.RET_CHAIR)
		return user.isMainCampus
			? sql`pr.campus_id = ${user.campusId} AND pr.department_id = ${user.departmentId}`
			: sql`pr.campus_id = ${user.campusId}`;
	if (user.roleName === ROLE_NAMES.FACULTY)
		return sql`EXISTS (SELECT 1 FROM proposal_members m WHERE m.proposal_id = pr.proposal_id AND m.user_id = ${user.userId} AND m.archived_at IS NULL)`;
	throw new ApiError(403, "FORBIDDEN", "Operational analytics access required");
}

function projectBase(
	user: AuthUser,
	filters: AnalyticsFilters,
	view: AnalyticsView,
	includePeriod = true,
): SQL {
	const predicates = [
		analyticsScope(user),
		sql`pr.archived_at IS NULL`,
		sql`(p.project_id IS NULL OR p.archived_at IS NULL)`,
	];
	if (filters.campusId)
		predicates.push(sql`pr.campus_id = ${filters.campusId}`);
	if (filters.departmentId)
		predicates.push(sql`pr.department_id = ${filters.departmentId}`);
	if (view === "reach") predicates.push(sql`p.project_status = 'Closed'`);
	const date = view === "reach" ? sql`p.actual_end_date` : sql`pr.created_at`;
	if (view !== "participation" && includePeriod)
		predicates.push(
			sql`${date} >= ${`${filters.year}-01-01T00:00:00+08:00`}::timestamptz AND ${date} < ${`${filters.year + 1}-01-01T00:00:00+08:00`}::timestamptz`,
		);
	if (filters.facultyId) {
		if (
			user.roleName === ROLE_NAMES.FACULTY &&
			filters.facultyId !== user.userId
		)
			throw new ApiError(
				403,
				"FORBIDDEN",
				"Only personal contributions are available",
			);
		predicates.push(
			sql`EXISTS (SELECT 1 FROM proposal_members fm WHERE fm.proposal_id = pr.proposal_id AND fm.user_id = ${filters.facultyId} AND fm.archived_at IS NULL)`,
		);
	}
	return sql`WITH base AS (
		SELECT pr.proposal_id, pr.title, pr.campus_id, pr.department_id, pr.banner_program_id, pr.created_at,
			c.campus_name AS campus, d.department_name AS department,
			p.project_id, COALESCE(p.project_status, pr.status) AS status, p.actual_end_date AS closed_at,
			r.report_id, r.trainee_count,
			(p.project_status IN (${sql.join(ACTIVE_EXTENSION_PROJECT_STATUSES.map((status) => sql`${status}`), sql`, `)})) AS active
		FROM proposals pr
		JOIN campuses c ON c.campus_id = pr.campus_id JOIN departments d ON d.department_id = pr.department_id
		LEFT JOIN projects p ON p.proposal_id = pr.proposal_id
		LEFT JOIN LATERAL (
			SELECT rr.report_id, rr.trainee_count FROM project_reports rr
			WHERE rr.project_id = p.project_id AND rr.archived_at IS NULL AND rr.storage_path IS NOT NULL
			AND rr.report_type IN ('Accomplishment and Terminal Report', 'Terminal')
			ORDER BY CASE WHEN rr.report_type = 'Accomplishment and Terminal Report' THEN 0 ELSE 1 END, rr.submitted_at DESC NULLS LAST, rr.report_id LIMIT 1
		) r ON true
		WHERE ${sql.join(predicates, sql` AND `)}
	)`;
}

const categorySources = {
	program: sql`SELECT b.proposal_id, COALESCE(bp.banner_program_id::text, 'unclassified') AS key, COALESCE(bp.program_name, 'Unclassified / legacy program') AS label FROM base b LEFT JOIN banner_programs bp ON bp.banner_program_id = b.banner_program_id`,
	sector: sql`SELECT b.proposal_id, COALESCE(s.sector_id::text, 'unclassified') AS key, COALESCE(s.sector_name, 'Unclassified') AS label FROM base b LEFT JOIN proposal_beneficiaries pb ON pb.proposal_id = b.proposal_id AND pb.archived_at IS NULL LEFT JOIN beneficiary_sectors s ON s.sector_id = pb.sector_id`,
	sdg: sql`SELECT b.proposal_id, COALESCE(s.sdg_id::text, 'unclassified') AS key, COALESCE(s.sdg_number::text || ' — ' || s.sdg_title, 'Unclassified') AS label FROM base b LEFT JOIN proposal_sdgs ps ON ps.proposal_id = b.proposal_id LEFT JOIN sdgs s ON s.sdg_id = ps.sdg_id`,
	service: sql`SELECT b.proposal_id, COALESCE(s.extension_service_id::text, 'unclassified') AS key, COALESCE(s.service_name, 'Unclassified') AS label FROM base b LEFT JOIN proposal_extension_services ps ON ps.proposal_id = b.proposal_id AND ps.archived_at IS NULL LEFT JOIN extension_services s ON s.extension_service_id = ps.extension_service_id`,
};

function isFacultyList(
	user: AuthUser,
	filters: AnalyticsFilters,
	view: AnalyticsView,
) {
	return (
		view === "participation" &&
		!filters.facultyId &&
		user.roleName !== ROLE_NAMES.FACULTY
	);
}

function selectedProjects(
	user: AuthUser,
	filters: AnalyticsFilters,
	view: AnalyticsView,
) {
	const selection =
		filters.category && view === "coverage"
			? sql`AND EXISTS (SELECT 1 FROM categories cat WHERE cat.proposal_id = b.proposal_id AND cat.key = ${filters.category})`
			: sql``;
	const missing =
		view === "reach" && filters.missing === "true"
			? sql`AND b.trainee_count IS NULL`
			: sql``;
	return sql`${projectBase(user, filters, view)}, categories AS (${categorySources[filters.groupBy]}), selected AS (SELECT b.* FROM base b WHERE true ${selection} ${missing})`;
}

function involvementProjectScope(user: AuthUser, filters: AnalyticsFilters) {
	const projectConditions: SQL[] = [];
	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		projectConditions.push(eq(proposals.campusId, user.campusId));
		if (user.isMainCampus) {
			projectConditions.push(sql`${proposals.departmentId} = ${user.departmentId}`);
		}
	}
	if (filters.campusId)
		projectConditions.push(eq(proposals.campusId, filters.campusId));
	if (filters.departmentId)
		projectConditions.push(eq(proposals.departmentId, filters.departmentId));
	return and(...projectConditions);
}

function facultyRows(user: AuthUser, filters: AnalyticsFilters) {
	const facultyConditions = [
		sql`u.archived_at IS NULL AND u.is_active AND ro.role_name IN ('Faculty', 'RET Chair')`,
	];
	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		facultyConditions.push(sql`u.campus_id = ${user.campusId}`);
		if (user.isMainCampus)
			facultyConditions.push(sql`u.department_id = ${user.departmentId}`);
	}
	if (filters.campusId)
		facultyConditions.push(sql`u.campus_id = ${filters.campusId}`);
	if (filters.departmentId)
		facultyConditions.push(sql`u.department_id = ${filters.departmentId}`);
	const involvement = getActiveInvolvementSubquery(
		involvementProjectScope(user, filters),
	);
	return sql`WITH faculty AS (
		SELECT u.user_id AS id, concat_ws(' ', u.first_name, u.last_name) AS label,
			c.campus_name AS campus, d.department_name AS department,
			coalesce(${involvement.totalInvolvement}, 0)::int AS projects,
			coalesce(${involvement.leadProjects}, 0)::int AS lead,
			coalesce(${involvement.collaboratorProjects}, 0)::int AS collaboration
		FROM users u JOIN roles ro ON ro.role_id = u.role_id
		LEFT JOIN campuses c ON c.campus_id = u.campus_id
		LEFT JOIN departments d ON d.department_id = u.department_id
		LEFT JOIN ${involvement} ON ${involvement.userId} = u.user_id
		WHERE ${sql.join(facultyConditions, sql` AND `)}
	)`;
}

/** Only detail rows: used by the page and by later CSV batches. */
async function getAnalyticsItems(
	user: AuthUser,
	filters: AnalyticsFilters,
	view: AnalyticsView,
	executor: Pick<typeof db, "execute"> = db,
) {
	const statement = isFacultyList(user, filters, view)
		? sql`${facultyRows(user, filters)} SELECT 'faculty' AS kind, id::text, label, campus, department, id::text AS "userId", projects, lead, collaboration FROM faculty ORDER BY projects DESC, label, id LIMIT ${filters.limit} OFFSET ${(filters.page - 1) * filters.limit}`
		: sql`${selectedProjects(user, filters, view)} SELECT 'project' AS kind, b.proposal_id::text AS id, b.title AS label, b.campus, b.department, b.proposal_id::text AS "proposalId", b.report_id::text AS "reportId", b.status,
			b.closed_at::text AS "closedAt", CASE WHEN b.status = 'Closed' THEN b.trainee_count ELSE NULL END AS "traineeCount",
			${view === "participation" ? sql`CASE WHEN EXISTS (SELECT 1 FROM proposal_members m WHERE m.proposal_id = b.proposal_id AND m.archived_at IS NULL AND m.user_id = ${filters.facultyId ?? user.userId} AND m.project_role = 'Project Leader') THEN 'Project Leader' ELSE 'Collaborator' END` : sql`NULL::text`} AS "projectRole"
			FROM selected b WHERE true ${view === "participation" ? sql`AND b.created_at >= ${`${filters.year}-01-01T00:00:00+08:00`}::timestamptz AND b.created_at < ${`${filters.year + 1}-01-01T00:00:00+08:00`}::timestamptz` : sql``}
			ORDER BY b.created_at DESC, b.proposal_id LIMIT ${filters.limit} OFFSET ${(filters.page - 1) * filters.limit}`;
	return AnalyticsItem.array().parse(await executor.execute(statement));
}

export async function getAnalytics(
	user: AuthUser,
	filters: AnalyticsFilters,
	view: AnalyticsView,
	executor: Pick<typeof db, "execute"> = db,
) {
	const query = async <T>(statement: SQL): Promise<T[]> =>
		(await executor.execute(statement)) as unknown as T[];
	const facultyList = isFacultyList(user, filters, view);
	const cte = selectedProjects(user, filters, view);
	const [counts] = await query<{
		total: number;
		participating: number;
		average: string;
		trainees: string;
		recorded: number;
		missing: number;
		proposals: number;
		active: number;
		implemented: number;
		closed: number;
	}>(facultyList ? sql`${facultyRows(user, filters)} SELECT count(*)::int AS total, count(*) FILTER (WHERE projects > 0)::int AS participating, COALESCE(avg(projects), 0)::text AS average FROM faculty` : sql`${cte} SELECT count(*)::int AS total, COALESCE(sum(trainee_count) FILTER (WHERE status = 'Closed'), 0)::text AS trainees,
		count(*) FILTER (WHERE trainee_count IS NOT NULL AND status = 'Closed')::int AS recorded,
		count(*) FILTER (WHERE trainee_count IS NULL AND status = 'Closed')::int AS missing,
		count(*) FILTER (WHERE project_id IS NULL)::int AS proposals,
		count(*) FILTER (WHERE active)::int AS active,
		count(*) FILTER (WHERE project_id IS NOT NULL AND status IN ('Ongoing', 'Overdue', 'Pending Closure', 'Closed', 'Completed', 'Expired'))::int AS implemented,
		count(*) FILTER (WHERE status = 'Closed')::int AS closed FROM selected`);
	const groups =
		view === "coverage"
			? await query(
					sql`${cte} SELECT cat.key, cat.label, count(DISTINCT b.proposal_id)::int AS projects, NULL::int AS trainees, 0 AS recorded, 0 AS missing FROM selected b JOIN categories cat ON cat.proposal_id = b.proposal_id GROUP BY cat.key, cat.label ORDER BY projects DESC, cat.label`,
				)
			: view === "participation"
				? []
				: await query(sql`${cte} SELECT ${filters.campusId ? sql`department_id` : sql`campus_id`}::text AS key, ${filters.campusId ? sql`department` : sql`campus`} AS label, count(*)::int AS projects,
			COALESCE(sum(trainee_count) FILTER (WHERE status = 'Closed'), 0)::text AS trainees,
			count(*) FILTER (WHERE trainee_count IS NOT NULL AND status = 'Closed')::int AS recorded, count(*) FILTER (WHERE trainee_count IS NULL AND status = 'Closed')::int AS missing
			FROM selected GROUP BY key, label ORDER BY projects DESC, label`);
	let total = counts?.total ?? 0;
	const metric = (
		label: string,
		value: number | null,
		description: string,
	) => ({ label, value, description });
	let metrics =
		view === "reach"
			? [
					metric(
						"Reported trainees",
						Number(counts?.trainees ?? 0),
						"From projects with Director-approved closure",
					),
					metric(
						"Projects with counts",
						counts?.recorded ?? 0,
						"Explicit zero is a recorded count",
					),
					metric(
						"Missing counts",
						counts?.missing ?? 0,
						"Unknown values are not treated as zero",
					),
					metric(
						"Counts recorded (%)",
						total ? Math.round(((counts?.recorded ?? 0) / total) * 100) : null,
						"Share of closed projects with trainee counts",
					),
				]
			: [
					metric(
						"Proposals",
						counts?.proposals ?? 0,
						"Proposals that have not become projects",
					),
					metric(
						"Implementation started",
						counts?.implemented ?? 0,
						"Projects that moved beyond approval, including closed projects",
					),
					metric(
						"Closed projects",
						counts?.closed ?? 0,
						"Closure approved by the Director",
					),
					metric(
						"Projects and proposals",
						total,
						"Each project or proposal is counted once",
					),
				];
	if (facultyList) {
		metrics = [
			metric(
				"Active faculty",
				total,
				"Active Faculty and RET Chair accounts in this unit",
			),
			metric(
				"With active projects",
				counts?.participating ?? 0,
				"Faculty currently leading or supporting a project",
			),
			metric(
				"Participation (%)",
				total
					? Math.round(((counts?.participating ?? 0) / total) * 100)
					: null,
				"Share of active faculty involved in active projects",
			),
			metric(
				"Average involvement",
				Number(Number(counts?.average ?? 0).toFixed(1)),
				"Active projects per faculty member",
			),
		];
	} else {
		const contribution =
			view === "participation"
				? sql`AND b.created_at >= ${`${filters.year}-01-01T00:00:00+08:00`}::timestamptz AND b.created_at < ${`${filters.year + 1}-01-01T00:00:00+08:00`}::timestamptz`
				: sql``;
		if (view === "participation") {
			const [result] = await query<{ value: number }>(
				sql`${cte} SELECT count(*)::int AS value FROM selected b WHERE true ${contribution}`,
			);
			total = result?.value ?? 0;
			const involvement = getActiveInvolvementSubquery(
				involvementProjectScope(user, filters),
			);
			const [contributions] = await query<{
				lead: number;
				collaboration: number;
				trainees: string;
			}>(sql`${cte} SELECT
				COALESCE(max(${involvement.leadProjects}), 0)::int AS lead,
				COALESCE(max(${involvement.collaboratorProjects}), 0)::int AS collaboration,
				COALESCE(sum(b.trainee_count) FILTER (WHERE b.status = 'Closed' AND b.created_at >= ${`${filters.year}-01-01T00:00:00+08:00`}::timestamptz AND b.created_at < ${`${filters.year + 1}-01-01T00:00:00+08:00`}::timestamptz), 0)::text AS trainees
				FROM selected b JOIN proposal_members m ON m.proposal_id = b.proposal_id AND m.archived_at IS NULL AND m.user_id = ${filters.facultyId ?? user.userId}
				LEFT JOIN ${involvement} ON ${involvement.userId} = m.user_id`);
			metrics = [
				metric(
					"Currently leading",
					contributions?.lead ?? 0,
					"Active projects led by this faculty member",
				),
				metric(
					"Currently collaborating",
					contributions?.collaboration ?? 0,
					"Active projects supported by this faculty member",
				),
				metric(
					"Projects in this history",
					total,
					`Projects and proposals created in ${filters.year}`,
				),
				metric(
					"Reach of involved projects",
					Number(contributions?.trainees ?? 0),
					"Recorded trainees of closed projects in this history; not personally delivered reach",
				),
			];
		}
	}
	let undatedProjects = 0;
	if (view === "reach") {
		const [undated] = await query<{ value: number }>(
			sql`${projectBase(user, filters, view, false)} SELECT count(*)::int AS value FROM base WHERE closed_at IS NULL`,
		);
		undatedProjects = undated?.value ?? 0;
	}
	return AnalyticsResponse.parse({
		undatedProjects,
		metrics,
		groups,
		items: await getAnalyticsItems(user, filters, view, executor),
		total,
		dateBasis:
			view === "reach"
				? `Projects closed in ${filters.year} · Philippine time`
				: view === "coverage"
					? `Projects and proposals created in ${filters.year} · Philippine time`
					: !filters.facultyId && user.roleName !== ROLE_NAMES.FACULTY
						? "Faculty involvement shows current active projects."
						: `Involvement totals show current activity. Project history shows projects created in ${filters.year}.`,
		scopeLabel:
			user.roleName === ROLE_NAMES.FACULTY
				? "My project contributions"
				: user.roleName === ROLE_NAMES.RET_CHAIR
					? user.isMainCampus
						? (user.departmentName ?? user.campusName)
						: user.campusName
					: "All campuses and departments",
		generatedAt: new Date().toISOString(),
	});
}

export async function exportAnalytics(
	user: AuthUser,
	filters: AnalyticsFilters,
	view: AnalyticsView,
) {
	return db.transaction(
		async (tx) => {
			const batchSize = 1000;
			const first = await getAnalytics(
				user,
				{ ...filters, page: 1, limit: batchSize },
				view,
				tx,
			);
			if (first.total > 10000)
				throw new ApiError(
					400,
					"EXPORT_TOO_LARGE",
					"Narrow the filters to export at most 10,000 records",
				);
			const items = [...first.items];
			for (let page = 2; page <= Math.ceil(first.total / batchSize); page++) {
				const next = await getAnalyticsItems(
					user,
					{ ...filters, page, limit: batchSize },
					view,
					tx,
				);
				items.push(...next);
			}
			const facultyList = isFacultyList(user, filters, view);
			const rows: unknown[][] = [
				["Scope", first.scopeLabel],
				["Date basis", first.dateBasis],
				["Generated", first.generatedAt],
				[
					"Filters",
					JSON.stringify({ ...filters, page: undefined, limit: undefined }),
				],
				["Closed projects without closure dates", first.undatedProjects],
				...first.metrics.map((m) => [m.label, m.value]),
				[],
				view === "coverage"
					? ["Category", "Projects and proposals"]
					: [
							"Unit",
							"Closed projects",
							"Reported trainees",
							"Counts recorded",
							"Missing counts",
						],
				...first.groups.map((group) =>
					view === "coverage"
						? [group.label, group.projects]
						: [
								group.label,
								group.projects,
								group.trainees,
								group.recorded,
								group.missing,
							],
				),
				[],
				facultyList
					? [
							"Faculty",
							"Campus",
							"Department",
							"Active project involvement",
							"Leading",
							"Collaborating",
						]
					: [
							"Project / proposal",
							"Campus",
							"Lead department",
							"Status",
							"Closure date",
							"Approved project reach",
							...(view === "participation" ? ["Project role"] : []),
						],
			];
			for (const item of items)
				rows.push(
					item.kind === "faculty"
						? [
								item.label,
								item.campus,
								item.department,
								item.projects,
								item.lead,
								item.collaboration,
							]
						: [
								item.label,
								item.campus,
								item.department,
								item.status,
								item.closedAt,
								item.traineeCount,
								...(view === "participation"
									? [item.projectRole]
									: []),
							],
				);
			return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
		},
		{ isolationLevel: "repeatable read", accessMode: "read only" },
	);
}
