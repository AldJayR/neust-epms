import type { z } from "@hono/zod-openapi";
import {
	and,
	asc,
	desc,
	eq,
	inArray,
	isNull,
	ne,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "@/db/client.js";
import { departments } from "@/db/schema/departments.js";
import { projectReportingMilestones } from "@/db/schema/project-reporting-milestones.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposalReviews } from "@/db/schema/proposal-reviews.js";
import { proposals } from "@/db/schema/proposals.js";
import { reportAttachments } from "@/db/schema/report-attachments.js";
import { roles } from "@/db/schema/roles.js";
import { users } from "@/db/schema/users.js";
import { ACTIVE_EXTENSION_PROJECT_STATUSES } from "@/lib/faculty-involvement.js";
import { getLeaderSubquery } from "@/lib/leader-subquery.js";
import { projectPeriodClause } from "@/lib/project-period.js";
import {
	institutionalScansRecorded,
	submittedSpecialOrderExists,
} from "@/lib/proposal-readiness.js";
import {
	ATTACHMENT_TYPE,
	type AuthUser,
	PROJECT_STATUS,
	PROPOSAL_STATUS,
	REPORT_TYPE,
	REVIEW_DECISION,
	REVIEW_STAGE,
} from "@/lib/types.js";
import { getPeriodChart } from "../dashboard/dashboard.service.js";
import { terminalPackageMissingRequirements } from "../reports/terminal-package-requirements.js";
import type {
	OverviewQuerySchema,
	WorkQueueQuerySchema,
	WorkQueueResponseSchema,
} from "./dashboard-overview.schema.js";

type OverviewQuery = z.infer<typeof OverviewQuerySchema>;

function projectCounts() {
	return {
		totalProjects: sql<number>`count(${projects.projectId})::int`,
		activeProjects: sql<number>`count(*) FILTER (WHERE ${inArray(projects.projectStatus, ACTIVE_EXTENSION_PROJECT_STATUSES)})::int`,
		ongoingProjects: sql<number>`count(*) FILTER (WHERE ${projects.projectStatus} = ${PROJECT_STATUS.ONGOING})::int`,
		overdueProjects: sql<number>`count(*) FILTER (WHERE ${projects.projectStatus} = ${PROJECT_STATUS.OVERDUE})::int`,
		pendingCompletionProjects: sql<number>`count(*) FILTER (WHERE ${projects.projectStatus} = ${PROJECT_STATUS.PENDING_COMPLETION})::int`,
		completedProjects: sql<number>`count(*) FILTER (WHERE ${projects.projectStatus} = ${PROJECT_STATUS.COMPLETED})::int`,
	};
}

export async function getDirectorOverview(
	user: AuthUser,
	query: OverviewQuery,
) {
	const scope: SQL[] = [
		isNull(proposals.archivedAt),
		isNull(projects.archivedAt),
		projectPeriodClause(query.year),
	];
	if (query.campusId !== undefined)
		scope.push(eq(proposals.campusId, query.campusId));
	if (query.departmentId !== undefined)
		scope.push(
			query.departmentId === 0
				? isNull(proposals.departmentId)
				: eq(proposals.departmentId, query.departmentId),
		);
	const facultySelection = {
		faculty: sql<number>`count(DISTINCT ${users.userId})::int`,
		leaders: sql<number>`count(*) FILTER (WHERE ${proposalMembers.projectRole} = 'Project Leader')::int`,
		collaborators: sql<number>`count(*) FILTER (WHERE ${proposalMembers.projectRole} <> 'Project Leader')::int`,
	};
	const facultyQuery = (byDepartment: boolean) =>
		db
			.select({
				departmentId: byDepartment
					? proposals.departmentId
					: sql<number | null>`NULL`,
				...facultySelection,
			})
			.from(proposals)
			.innerJoin(projects, eq(projects.proposalId, proposals.proposalId))
			.innerJoin(
				proposalMembers,
				eq(proposalMembers.proposalId, proposals.proposalId),
			)
			.innerJoin(users, eq(users.userId, proposalMembers.userId))
			.innerJoin(roles, eq(users.roleId, roles.roleId))
			.where(
				and(
					...scope,
					inArray(projects.projectStatus, ACTIVE_EXTENSION_PROJECT_STATUSES),
					isNull(proposalMembers.archivedAt),
					isNull(users.archivedAt),
					eq(users.isActive, true),
					inArray(roles.roleName, ["Faculty", "RET Chair"]),
				),
			);

	const [
		metrics,
		departmentRows,
		stages,
		facultyRows,
		facultyTotals,
		options,
		chartData,
	] = await Promise.all([
		db
			.select({
				...projectCounts(),
				submittedProposals: sql<number>`count(*) FILTER (WHERE ${proposals.status} <> ${PROPOSAL_STATUS.DRAFT})::int`,
			})
			.from(proposals)
			.leftJoin(projects, eq(projects.proposalId, proposals.proposalId))
			.where(and(...scope)),
		db
			.select({ departmentId: proposals.departmentId, ...projectCounts() })
			.from(proposals)
			.innerJoin(projects, eq(projects.proposalId, proposals.proposalId))
			.where(and(...scope))
			.groupBy(proposals.departmentId),
		db
			.select({ status: proposals.status, count: sql<number>`count(*)::int` })
			.from(proposals)
			.leftJoin(projects, eq(projects.proposalId, proposals.proposalId))
			.where(and(...scope, ne(proposals.status, PROPOSAL_STATUS.DRAFT)))
			.groupBy(proposals.status),
		facultyQuery(true).groupBy(proposals.departmentId),
		// Distinct faculty across departments cannot be obtained by summing department counts.
		facultyQuery(false),
		db
			.select({
				id: departments.departmentId,
				name: departments.departmentName,
				code: departments.departmentCode,
			})
			.from(departments)
			.where(
				query.campusId === undefined
					? undefined
					: sql`EXISTS (SELECT 1 FROM ${users} WHERE ${users.departmentId} = ${departments.departmentId} AND ${users.campusId} = ${query.campusId} AND ${users.archivedAt} IS NULL) OR EXISTS (SELECT 1 FROM ${proposals} WHERE ${proposals.departmentId} = ${departments.departmentId} AND ${proposals.campusId} = ${query.campusId} AND ${proposals.archivedAt} IS NULL)`,
			)
			.orderBy(asc(departments.departmentName)),
		getPeriodChart(user, query.year, {
			campusId: query.campusId,
			departmentId: query.departmentId,
		}),
	]);
	const emptyCounts = {
		totalProjects: 0,
		activeProjects: 0,
		ongoingProjects: 0,
		overdueProjects: 0,
		pendingCompletionProjects: 0,
		completedProjects: 0,
	};
	const departmentMap = new Map<number | null, (typeof departmentRows)[number]>(
		departmentRows.map((row) => [row.departmentId, row]),
	);
	const facultyMap = new Map(facultyRows.map((row) => [row.departmentId, row]));
	const units: { id: number | null; name: string; code: string }[] = [
		...options,
	];
	if (departmentMap.has(null) || query.departmentId === 0)
		units.push({ id: null, name: "Unassigned", code: "Unassigned" });
	return {
		metrics: metrics[0] ?? { ...emptyCounts, submittedProposals: 0 },
		departments: units
			.filter(
				(unit) =>
					query.departmentId === undefined ||
					(unit.id ?? 0) === query.departmentId,
			)
			.map((unit) => ({
				...emptyCounts,
				...departmentMap.get(unit.id),
				departmentId: unit.id,
				name: unit.name,
				code: unit.code,
				faculty: facultyMap.get(unit.id)?.faculty ?? 0,
				leaders: facultyMap.get(unit.id)?.leaders ?? 0,
				collaborators: facultyMap.get(unit.id)?.collaborators ?? 0,
			})),
		departmentOptions: options.map(({ id, name }) => ({ id, name })),
		proposalStages: stages,
		faculty: facultyTotals[0] ?? { faculty: 0, leaders: 0, collaborators: 0 },
		chartMonths: Array.from(
			{ length: 12 },
			(_, index) => `${query.year}-${String(index + 1).padStart(2, "0")}`,
		),
		chartData,
	};
}

/** One classification shared by queue counts and paginated rows. No preview-based totals. */
function decisionQueue() {
	return sql<string | null>`CASE
		WHEN ${proposals.status} = ${PROPOSAL_STATUS.ENDORSED} THEN 'review'
		WHEN (${projects.projectId} IS NULL OR ${projects.projectStatus} = ${PROJECT_STATUS.APPROVED}) AND (
			${proposals.status} = ${PROPOSAL_STATUS.APPROVED} OR (
				${proposals.status} = ${PROPOSAL_STATUS.INSTITUTIONALLY_APPROVED} AND NOT ${institutionalScansRecorded()}
			)
		) THEN 'signing'
		WHEN ${projects.projectStatus} = ${PROJECT_STATUS.APPROVED} AND ${institutionalScansRecorded()} AND ${submittedSpecialOrderExists()} THEN 'activation'
		WHEN ${projects.projectStatus} = ${PROJECT_STATUS.PENDING_COMPLETION} THEN 'completion'
		ELSE NULL END`;
}

export async function getDirectorWorkQueue(
	query: z.infer<typeof WorkQueueQuerySchema>,
) {
	const now = new Date();
	const scope = and(isNull(proposals.archivedAt), isNull(projects.archivedAt));
	const queue = decisionQueue();
	const classified = db
		.select({ queue: queue.as("queue") })
		.from(proposals)
		.leftJoin(projects, eq(projects.proposalId, proposals.proposalId))
		.where(scope)
		.as("classified");
	const terminalTypes = [
		"Terminal Report",
		"Project Closure",
		REPORT_TYPE.TERMINAL,
		REPORT_TYPE.FINAL_ACCOMPLISHMENT,
		REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL,
	];
	const reportScope = and(
		scope,
		inArray(projects.projectStatus, [
			PROJECT_STATUS.ONGOING,
			PROJECT_STATUS.OVERDUE,
		]),
		isNull(projectReportingMilestones.completedAt),
		or(
			inArray(projectReportingMilestones.reportType, terminalTypes),
			eq(projectReportingMilestones.milestoneType, "Closure"),
		),
	);
	const [countRows, [reportCount]] = await Promise.all([
		db
			.select({ queue: classified.queue, count: sql<number>`count(*)::int` })
			.from(classified)
			.groupBy(classified.queue),
		db
			.select({
				count: sql<number>`count(*)::int`,
				overdue: sql<number>`count(*) FILTER (WHERE ${projectReportingMilestones.dueAt} < ${now.toISOString()})::int`,
			})
			.from(projectReportingMilestones)
			.innerJoin(
				projects,
				eq(projects.projectId, projectReportingMilestones.projectId),
			)
			.innerJoin(proposals, eq(proposals.proposalId, projects.proposalId))
			.where(reportScope),
	]);
	const counts = {
		review: 0,
		signing: 0,
		activation: 0,
		completion: 0,
		reports: reportCount?.count ?? 0,
	};
	for (const row of countRows)
		if (row.queue && row.queue in counts)
			counts[row.queue as keyof typeof counts] = row.count;
	const leader = getLeaderSubquery();
	const selection = {
		proposalId: proposals.proposalId,
		projectId: projects.projectId,
		title: proposals.title,
		department: sql<string>`coalesce(${departments.departmentCode}, 'Unassigned')`,
		leader: sql<string>`coalesce(nullif(trim(concat(${users.firstName}, ' ', ${users.lastName})), ''), 'No leader assigned')`,
	};
	const total = counts[query.queue];
	const page = Math.min(
		query.page,
		Math.max(1, Math.ceil(total / query.limit)),
	);
	const offset = (page - 1) * query.limit;
	let items: z.infer<typeof WorkQueueResponseSchema>["items"];
	if (query.queue === "reports") {
		const latestReports = db
			.selectDistinctOn([projectReports.milestoneId], {
				milestoneId: projectReports.milestoneId,
				reportId: projectReports.reportId,
				reportType: projectReports.reportType,
				storagePath: projectReports.storagePath,
				traineeCount: projectReports.traineeCount,
			})
			.from(projectReports)
			.where(isNull(projectReports.archivedAt))
			.orderBy(
				projectReports.milestoneId,
				sql`CASE WHEN ${projectReports.reportType} = ${REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL} THEN 0 WHEN ${projectReports.reportType} = ${REPORT_TYPE.TERMINAL} THEN 1 ELSE 2 END`,
				sql`${projectReports.submittedAt} DESC NULLS LAST`,
				desc(projectReports.createdAt),
				projectReports.reportId,
			)
			.as("latest_terminal_reports");
		const legacyUploaded = (type: string) =>
			sql<boolean>`EXISTS (SELECT 1 FROM ${projectReports} WHERE ${projectReports.milestoneId} = ${projectReportingMilestones.milestoneId} AND ${projectReports.archivedAt} IS NULL AND ${projectReports.reportType} = ${type} AND ${projectReports.storagePath} IS NOT NULL)`;
		const rows = await db
			.select({
				...selection,
				id: projectReportingMilestones.milestoneId,
				dueAt: projectReportingMilestones.dueAt,
				reportType: latestReports.reportType,
				storagePath: latestReports.storagePath,
				traineeCount: latestReports.traineeCount,
				evaluationUploaded: sql<boolean>`EXISTS (SELECT 1 FROM ${reportAttachments} WHERE ${reportAttachments.reportId} = ${latestReports.reportId} AND ${reportAttachments.attachmentType} = ${ATTACHMENT_TYPE.EVALUATION_FORMS} AND ${reportAttachments.archivedAt} IS NULL)`,
				legacyTerminalUploaded: legacyUploaded(REPORT_TYPE.TERMINAL),
				legacyAccomplishmentUploaded: legacyUploaded(
					REPORT_TYPE.FINAL_ACCOMPLISHMENT,
				),
			})
			.from(projectReportingMilestones)
			.innerJoin(
				projects,
				eq(projects.projectId, projectReportingMilestones.projectId),
			)
			.innerJoin(proposals, eq(proposals.proposalId, projects.proposalId))
			.leftJoin(
				departments,
				eq(departments.departmentId, proposals.departmentId),
			)
			.leftJoin(leader, eq(leader.proposalId, proposals.proposalId))
			.leftJoin(users, eq(users.userId, leader.userId))
			.leftJoin(
				latestReports,
				eq(latestReports.milestoneId, projectReportingMilestones.milestoneId),
			)
			.where(reportScope)
			.orderBy(
				asc(projectReportingMilestones.dueAt),
				asc(projectReportingMilestones.milestoneId),
			)
			.limit(query.limit)
			.offset(offset);
		items = rows.map(
			({
				reportType,
				storagePath,
				traineeCount,
				evaluationUploaded,
				legacyTerminalUploaded,
				legacyAccomplishmentUploaded,
				dueAt,
				...row
			}) => {
				const missingRequirements =
					reportType === REPORT_TYPE.TERMINAL ||
					reportType === REPORT_TYPE.FINAL_ACCOMPLISHMENT
						? [
								...(!legacyTerminalUploaded
									? ["Terminal report not uploaded"]
									: []),
								...(!legacyAccomplishmentUploaded
									? ["Final accomplishment report not uploaded"]
									: []),
							]
						: terminalPackageMissingRequirements({
								documentUploaded: Boolean(storagePath),
								evaluationUploaded,
								traineeCount,
							});
				return {
					...row,
					status: !storagePath
						? "Awaiting submission"
						: missingRequirements.length
							? "Package incomplete"
							: "Awaiting package finalization",
					missingRequirements,
					since: null,
					dueAt: dueAt.toISOString(),
					overdue: dueAt < now,
				};
			},
		);
	} else {
		// Use actual stage timestamps; updatedAt is not reliable evidence of time waiting.
		const since = sql<Date | string | null>`CASE
			WHEN ${queue} = 'review' THEN (SELECT max(${proposalReviews.reviewedAt}) FROM ${proposalReviews} WHERE ${proposalReviews.proposalId} = ${proposals.proposalId} AND ${proposalReviews.reviewStage} = ${REVIEW_STAGE.ENDORSEMENT} AND ${proposalReviews.decision} = ${REVIEW_DECISION.ENDORSED})
			WHEN ${queue} = 'signing' THEN coalesce(${proposals.institutionalApprovedAt}, (SELECT max(${proposalReviews.reviewedAt}) FROM ${proposalReviews} WHERE ${proposalReviews.proposalId} = ${proposals.proposalId} AND ${proposalReviews.reviewStage} = ${REVIEW_STAGE.APPROVAL} AND ${proposalReviews.decision} = ${REVIEW_DECISION.APPROVED}))
			WHEN ${queue} = 'activation' THEN ${proposals.institutionalApprovedAt}
			WHEN ${queue} = 'completion' THEN (SELECT max(${projectReports.packageCompletedAt}) FROM ${projectReports} WHERE ${projectReports.projectId} = ${projects.projectId} AND ${projectReports.archivedAt} IS NULL)
			ELSE NULL END`;
		const rows = await db
			.select({
				...selection,
				id: proposals.proposalId,
				status: proposals.status,
				since,
			})
			.from(proposals)
			.leftJoin(projects, eq(projects.proposalId, proposals.proposalId))
			.leftJoin(
				departments,
				eq(departments.departmentId, proposals.departmentId),
			)
			.leftJoin(leader, eq(leader.proposalId, proposals.proposalId))
			.leftJoin(users, eq(users.userId, leader.userId))
			.where(and(scope, eq(queue, query.queue)))
			.orderBy(sql`${since} ASC NULLS LAST`, asc(proposals.proposalId))
			.limit(query.limit)
			.offset(offset);
		items = rows.map((row) => ({
			...row,
			missingRequirements: [],
			since: row.since ? new Date(row.since).toISOString() : null,
			dueAt: null,
			overdue: false,
		}));
	}
	return {
		counts,
		overdueReports: reportCount?.overdue ?? 0,
		total,
		page,
		limit: query.limit,
		items,
	};
}
