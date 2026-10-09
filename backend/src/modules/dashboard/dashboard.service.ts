import { and, count, desc, eq, isNull, type SQL, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { campuses } from "@/db/schema/campuses.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { ApiError } from "@/lib/errors.js";
import { getLeaderSubquery } from "@/lib/leader-subquery.js";
import {
	currentManilaYear,
	projectPeriodClause,
	projectYearBounds,
} from "@/lib/project-period.js";
import { buildProposalScope } from "@/lib/scope-helpers.js";
import { type AuthUser, OPERATIONAL_ROLES, ROLE_NAMES } from "@/lib/types.js";
import { PeriodChartPointSchema } from "./dashboard.schema.js";

export async function getPeriodChart(user: AuthUser, year: number) {
	projectYearBounds(year);
	const rows = await db.execute(sql`
		SELECT to_char(calendar.month, 'YYYY-MM') AS month,
			${campuses.campusId} AS "campusId", ${campuses.campusName} AS "campusName", count(*)::int AS value
		FROM generate_series(${`${year}-01-01`}::timestamp, ${`${year}-12-01`}::timestamp, interval '1 month') AS calendar(month)
		JOIN ${proposals} ON ${proposals.targetStartDate} < ((calendar.month + interval '1 month') AT TIME ZONE 'Asia/Manila')
			AND ${proposals.targetEndDate} >= (calendar.month AT TIME ZONE 'Asia/Manila')
		JOIN ${projects} ON ${projects.proposalId} = ${proposals.proposalId}
		JOIN ${campuses} ON ${campuses.campusId} = ${proposals.campusId}
		WHERE ${and(...dashboardScope(user))}
		GROUP BY calendar.month, ${campuses.campusId}, ${campuses.campusName}
		ORDER BY calendar.month, ${campuses.campusId}
	`);
	return PeriodChartPointSchema.array().parse(rows);
}

export function dashboardScope(user: AuthUser): SQL[] {
	if (!OPERATIONAL_ROLES.some((role) => role === user.roleName))
		throw new ApiError(
			403,
			"FORBIDDEN",
			"Operational dashboard access required",
		);
	const scope = [...buildProposalScope(user), isNull(projects.archivedAt)];
	if (user.roleName === ROLE_NAMES.FACULTY) {
		scope.push(
			sql`EXISTS (SELECT 1 FROM ${proposalMembers} WHERE ${proposalMembers.proposalId} = ${proposals.proposalId} AND ${proposalMembers.userId} = ${user.userId} AND ${proposalMembers.archivedAt} IS NULL)`,
		);
	}
	return scope;
}

export async function getPeriodMetadata(user: AuthUser) {
	const [result] = await db
		.select({
			minYear: sql<
				number | null
			>`min(extract(year FROM ${proposals.targetStartDate} AT TIME ZONE 'Asia/Manila')) FILTER (WHERE ${proposals.targetStartDate} IS NOT NULL AND ${proposals.targetEndDate} IS NOT NULL)`,
			maxYear: sql<
				number | null
			>`max(extract(year FROM ${proposals.targetEndDate} AT TIME ZONE 'Asia/Manila')) FILTER (WHERE ${proposals.targetStartDate} IS NOT NULL AND ${proposals.targetEndDate} IS NOT NULL)`,
		})
		.from(proposals)
		.leftJoin(projects, eq(projects.proposalId, proposals.proposalId))
		.where(and(...dashboardScope(user)));
	const current = currentManilaYear();
	const years = new Set([current]);
	const min = Math.max(2000, Number(result?.minYear ?? current));
	const max = Math.min(2200, Number(result?.maxYear ?? current));
	for (let year = min; year <= max; year++) years.add(year);
	return {
		availableYears: [...years].sort((a, b) => b - a),
	};
}

async function dashboardItems(
	user: AuthUser,
	conditions: SQL[],
	page: number,
	limit: number,
) {
	const leader = getLeaderSubquery();
	const rows = await db
		.select({
			proposalId: proposals.proposalId,
			projectId: projects.projectId,
			title: proposals.title,
			status: sql<string>`CASE WHEN ${projects.projectStatus} IS NOT NULL AND ${projects.projectStatus} <> 'Approved' THEN ${projects.projectStatus} ELSE ${proposals.status} END`,
			targetStartDate: proposals.targetStartDate,
			targetEndDate: proposals.targetEndDate,
			createdAt: proposals.createdAt,
			leaderId: leader.userId,
		})
		.from(proposals)
		.leftJoin(projects, eq(projects.proposalId, proposals.proposalId))
		.leftJoin(leader, eq(leader.proposalId, proposals.proposalId))
		.where(and(...conditions))
		.orderBy(desc(proposals.createdAt), proposals.proposalId)
		.limit(limit)
		.offset((page - 1) * limit);
	return rows.map((row) => ({
		proposalId: row.proposalId,
		projectId: row.projectId,
		title: row.title,
		status: row.status,
		targetStartDate: row.targetStartDate?.toISOString() ?? null,
		targetEndDate: row.targetEndDate?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
		isLeader: row.leaderId === user.userId,
	}));
}

export async function getFacultyDashboard(
	user: AuthUser,
	query: { year: number; page: number; limit: number },
) {
	if (user.roleName !== ROLE_NAMES.FACULTY)
		throw new ApiError(403, "FORBIDDEN", "Faculty dashboard access required");
	const conditions = [...dashboardScope(user), projectPeriodClause(query.year)];
	const [metrics] = await db
		.select({
			totalSubmissions: count(),
			ongoingProjects: sql<number>`count(*) FILTER (WHERE ${projects.projectStatus} = 'Ongoing')::int`,
			proposals: sql<number>`count(*) FILTER (WHERE ${projects.projectId} IS NULL)::int`,
		})
		.from(proposals)
		.leftJoin(projects, eq(projects.proposalId, proposals.proposalId))
		.where(and(...conditions));
	const items = await dashboardItems(user, conditions, query.page, query.limit);
	const period = await getPeriodMetadata(user);
	return {
		...period,
		metrics: {
			totalSubmissions: Number(metrics?.totalSubmissions ?? 0),
			ongoingProjects: Number(metrics?.ongoingProjects ?? 0),
			proposals: Number(metrics?.proposals ?? 0),
		},
		items,
		total: Number(metrics?.totalSubmissions ?? 0),
	};
}
