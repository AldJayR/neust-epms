import {
	and,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/audit-logs.js";
import { campuses } from "@/db/schema/campuses.js";
import { departments } from "@/db/schema/departments.js";
import { moas } from "@/db/schema/moas.js";
import { partners } from "@/db/schema/partners.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { roles } from "@/db/schema/roles.js";
import { users } from "@/db/schema/users.js";
import { env } from "@/env.js";
import { getLeaderSubquery } from "@/lib/leader-subquery.js";
import {
	type AuthUser,
	PROJECT_STATUS,
	PROPOSAL_STATUS,
	type ProjectStatus,
	ROLE_NAMES,
} from "@/lib/types.js";

// ── Helper: format relative time ──
function formatRelativeTime(date: Date, now: Date): string {
	const diffMs = now.getTime() - date.getTime();
	const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffDays >= 2) {
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	}
	if (diffDays === 1) {
		return `Yesterday, ${date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
		})}`;
	}
	if (diffHours >= 1) {
		return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
	}
	if (diffMinutes >= 1) {
		return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
	}
	return "Just now";
}

// ── Helper: activity title ──
function activityTitle(action: string, tableAffected: string): string {
	const lowerAction = action.toLowerCase();
	if (
		lowerAction.includes("bulk approved") ||
		lowerAction.includes("approved") ||
		tableAffected === "projects"
	) {
		return "Project Approved";
	}
	if (lowerAction.includes("submitted") || tableAffected === "proposals") {
		return "New Proposal Submitted";
	}
	return "Review Pending";
}

// ── 1. getDashboardStats ──
export async function getDashboardStats(user: AuthUser) {
	const now = new Date();
	const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

	const projectMetricsConditions = [isNull(projects.archivedAt)];
	const underEvalConditions = [
		isNull(proposals.archivedAt),
		or(
			eq(proposals.status, PROPOSAL_STATUS.PENDING_REVIEW),
			eq(proposals.status, PROPOSAL_STATUS.ENDORSED),
		),
	];

	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			projectMetricsConditions.push(
				eq(proposals.departmentId, user.departmentId),
			);
			underEvalConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			projectMetricsConditions.push(eq(proposals.campusId, user.campusId));
			underEvalConditions.push(eq(proposals.campusId, user.campusId));
		}
	}

	const [projectMetrics, underEvaluationResult] = await Promise.all([
		db
			.select({
				total: sql<number>`count(*)`,
				ongoing: sql<number>`count(*) filter (where ${projects.projectStatus} = ${PROJECT_STATUS.ONGOING})`,
				completed: sql<number>`count(*) filter (where ${projects.projectStatus} = ${PROJECT_STATUS.COMPLETED})`,
				overdue: sql<number>`count(*) filter (where ${projects.projectStatus} = ${PROJECT_STATUS.OVERDUE})`,
				pendingClosure: sql<number>`count(*) filter (where ${projects.projectStatus} = ${PROJECT_STATUS.PENDING_CLOSURE})`,
			})
			.from(projects)
			.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
			.where(and(...projectMetricsConditions)),
		db
			.select({ value: count() })
			.from(proposals)
			.where(and(...underEvalConditions)),
	]);

	const chartConditions = [isNull(proposals.archivedAt)];
	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			chartConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			chartConditions.push(eq(proposals.campusId, user.campusId));
		}
	}

	const chartRows = await db
		.select({
			label: campuses.campusName,
			department: departments.departmentName,
			departmentCode: departments.departmentCode,
			value: count(),
		})
		.from(proposals)
		.innerJoin(campuses, eq(proposals.campusId, campuses.campusId))
		.innerJoin(
			departments,
			eq(proposals.departmentId, departments.departmentId),
		)
		.where(and(...chartConditions))
		.groupBy(
			campuses.campusName,
			departments.departmentName,
			departments.departmentCode,
		);

	const recentLogRows = await db
		.select({
			action: auditLogs.action,
			tableAffected: auditLogs.tableAffected,
			createdAt: auditLogs.createdAt,
			actorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
		})
		.from(auditLogs)
		.innerJoin(users, eq(auditLogs.userId, users.userId))
		.where(eq(auditLogs.userId, user.userId))
		.orderBy(desc(auditLogs.createdAt))
		.limit(3);

	const expiringMoaConditions = [
		isNull(moas.archivedAt),
		sql`${moas.validUntil} > ${now.toISOString()}`,
		sql`${moas.validUntil} <= ${twoWeeksFromNow.toISOString()}`,
	];

	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			expiringMoaConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			expiringMoaConditions.push(eq(proposals.campusId, user.campusId));
		}
	}

	const expiringMoaRows = await db
		.select({
			partnerName: partners.partnerName,
			validUntil: moas.validUntil,
		})
		.from(moas)
		.innerJoin(partners, eq(moas.partnerId, partners.partnerId))
		.innerJoin(projects, eq(moas.moaId, projects.moaId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.where(and(...expiringMoaConditions))
		.orderBy(moas.validUntil)
		.limit(2);

	return {
		metrics: {
			totalProjects: Number(projectMetrics[0]?.total ?? 0),
			ongoingProjects: Number(projectMetrics[0]?.ongoing ?? 0),
			underEvaluation: Number(underEvaluationResult[0]?.value ?? 0),
			completed: Number(projectMetrics[0]?.completed ?? 0),
			overdueProjects: Number(projectMetrics[0]?.overdue ?? 0),
			pendingClosureProjects: Number(projectMetrics[0]?.pendingClosure ?? 0),
		},
		chartData: chartRows
			.map((row) => ({
				label: row.label,
				department: row.department,
				departmentCode: row.departmentCode,
				value: Number(row.value ?? 0),
			}))
			.sort((a, b) => b.value - a.value),
		recentActivities: recentLogRows.map((row) => ({
			title: activityTitle(row.action, row.tableAffected),
			description: row.action,
			time: formatRelativeTime(row.createdAt, now),
		})),
		expiringMoas: expiringMoaRows.map((row) => {
			const daysUntilExpiry = Math.max(
				0,
				Math.ceil(
					(row.validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
				),
			);
			return {
				name: row.partnerName,
				dueText:
					daysUntilExpiry === 0
						? "Expires today"
						: `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`,
			};
		}),
	};
}

// ── 2. getFacultyDirectory ──
export async function getFacultyDirectory(
	query: {
		page: number;
		limit: number;
		search?: string | undefined;
		college?: string | undefined;
		status?: string | undefined;
	},
	user: AuthUser,
) {
	const { page, limit, search, college, status } = query;
	const offset = (page - 1) * limit;

	const whereConditions: (SQL | undefined)[] = [
		inArray(roles.roleName, [ROLE_NAMES.FACULTY, ROLE_NAMES.RET_CHAIR]),
	];

	if (status === "pending") {
		whereConditions.push(eq(users.isActive, false));
	} else {
		whereConditions.push(eq(users.isActive, true));
	}

	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			whereConditions.push(eq(users.departmentId, user.departmentId));
		} else {
			whereConditions.push(eq(users.campusId, user.campusId));
		}
	}

	if (search) {
		whereConditions.push(
			or(
				ilike(users.firstName, `${search}%`),
				ilike(users.lastName, `${search}%`),
			),
		);
	}

	if (college) {
		whereConditions.push(eq(departments.departmentName, college));
	}

	const facultyQuery = db
		.select({
			userId: users.userId,
			firstName: users.firstName,
			lastName: users.lastName,
			academicRank: users.academicRank,
			college: departments.departmentName,
			departmentCode: departments.departmentCode,
			campusName: campuses.campusName,
			isMainCampus: campuses.isMainCampus,
			isActive: users.isActive,
		})
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.leftJoin(departments, eq(users.departmentId, departments.departmentId))
		.leftJoin(campuses, eq(users.campusId, campuses.campusId))
		.where(and(...whereConditions))
		.orderBy(users.lastName);

	const rows = await facultyQuery.limit(limit).offset(offset);
	const totalResult = await db
		.select({ value: count() })
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.where(and(...whereConditions));

	const userIds = rows.map((r) => r.userId);

	const totalFacultyConditions = [
		eq(users.isActive, true),
		inArray(roles.roleName, [ROLE_NAMES.FACULTY, ROLE_NAMES.RET_CHAIR]),
	];
	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			totalFacultyConditions.push(eq(users.departmentId, user.departmentId));
		} else {
			totalFacultyConditions.push(eq(users.campusId, user.campusId));
		}
	}

	const mostActiveCollegeConditions = [
		eq(users.isActive, true),
		inArray(roles.roleName, [ROLE_NAMES.FACULTY, ROLE_NAMES.RET_CHAIR]),
	];
	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			mostActiveCollegeConditions.push(
				eq(users.departmentId, user.departmentId),
			);
		} else {
			mostActiveCollegeConditions.push(eq(users.campusId, user.campusId));
		}
	}

	const [totalFaculty, totalProjects, mostActiveCollege] = await Promise.all([
		db
			.select({ value: count() })
			.from(users)
			.innerJoin(roles, eq(users.roleId, roles.roleId))
			.where(and(...totalFacultyConditions)),
		db
			.select({ value: count() })
			.from(projects)
			.where(isNull(projects.archivedAt)),
		db
			.select({
				name: departments.departmentName,
				contributors: count(),
			})
			.from(users)
			.innerJoin(roles, eq(users.roleId, roles.roleId))
			.innerJoin(departments, eq(users.departmentId, departments.departmentId))
			.where(and(...mostActiveCollegeConditions))
			.groupBy(departments.departmentName)
			.orderBy(desc(count()))
			.limit(1),
	]);

	const totalFacultyRow = totalFaculty[0];
	const totalProjectsRow = totalProjects[0];
	const mostActiveCollegeRow = mostActiveCollege[0];

	if (userIds.length === 0) {
		return {
			items: [],
			total: Number(totalResult[0]?.value ?? 0),
			metrics: {
				totalActiveExtension: Number(totalFacultyRow?.value ?? 0),
				averageProjectsPerFaculty: 0,
				mostActiveCollege: {
					name: mostActiveCollegeRow?.name ?? "N/A",
					contributors: Number(mostActiveCollegeRow?.contributors ?? 0),
				},
			},
		};
	}

	const [leadCounts, collabCounts] = await Promise.all([
		db
			.select({
				userId: proposalMembers.userId,
				value: count(),
			})
			.from(projects)
			.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
			.innerJoin(
				proposalMembers,
				eq(proposals.proposalId, proposalMembers.proposalId),
			)
			.where(
				and(
					inArray(proposalMembers.userId, userIds),
					isNull(projects.archivedAt),
					eq(proposalMembers.projectRole, "Project Leader"),
				),
			)
			.groupBy(proposalMembers.userId),
		db
			.select({
				userId: proposalMembers.userId,
				value: count(),
			})
			.from(proposalMembers)
			.innerJoin(
				proposals,
				eq(proposalMembers.proposalId, proposals.proposalId),
			)
			.where(
				and(
					inArray(proposalMembers.userId, userIds),
					sql`${proposalMembers.projectRole} != 'Project Leader'`,
					isNull(proposals.archivedAt),
				),
			)
			.groupBy(proposalMembers.userId),
	]);

	const leadMap = new Map(
		leadCounts.map((r) => [r.userId, Number(r.value ?? 0)]),
	);
	const collabMap = new Map(
		collabCounts.map((r) => [r.userId, Number(r.value ?? 0)]),
	);

	const items = rows.map((row) => {
		const leadProjects = leadMap.get(row.userId) ?? 0;
		const collaboratorProjects = collabMap.get(row.userId) ?? 0;
		return {
			...row,
			leadProjects,
			collaboratorProjects,
			totalInvolvement: leadProjects + collaboratorProjects,
		};
	});

	return {
		items,
		total: Number(totalResult[0]?.value ?? 0),
		metrics: {
			totalActiveExtension: Number(totalFacultyRow?.value ?? 0),
			averageProjectsPerFaculty: Number(
				totalFacultyRow?.value
					? (
							Number(totalProjectsRow?.value) / Number(totalFacultyRow?.value)
						).toFixed(1)
					: 0,
			),
			mostActiveCollege: {
				name: mostActiveCollegeRow?.name ?? "N/A",
				contributors: Number(mostActiveCollegeRow?.contributors ?? 0),
			},
		},
	};
}

// ── 3. getFacultyInvolvementCounts (reused by email-report) ──
export async function getFacultyInvolvementCounts(
	userIds: string[],
): Promise<Map<string, { leadCount: number; collabCount: number }>> {
	if (userIds.length === 0) return new Map();

	const [leadCounts, collabCounts] = await Promise.all([
		db
			.select({
				userId: proposalMembers.userId,
				value: count(),
			})
			.from(projects)
			.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
			.innerJoin(
				proposalMembers,
				eq(proposals.proposalId, proposalMembers.proposalId),
			)
			.where(
				and(
					inArray(proposalMembers.userId, userIds),
					isNull(projects.archivedAt),
					eq(proposalMembers.projectRole, "Project Leader"),
				),
			)
			.groupBy(proposalMembers.userId),
		db
			.select({
				userId: proposalMembers.userId,
				value: count(),
			})
			.from(proposalMembers)
			.innerJoin(
				proposals,
				eq(proposalMembers.proposalId, proposals.proposalId),
			)
			.where(
				and(
					inArray(proposalMembers.userId, userIds),
					sql`${proposalMembers.projectRole} != 'Project Leader'`,
					isNull(proposals.archivedAt),
				),
			)
			.groupBy(proposalMembers.userId),
	]);

	const leadMap = new Map(
		leadCounts.map((r) => [r.userId, Number(r.value ?? 0)]),
	);
	const collabMap = new Map(
		collabCounts.map((r) => [r.userId, Number(r.value ?? 0)]),
	);

	const result = new Map<string, { leadCount: number; collabCount: number }>();
	for (const userId of userIds) {
		result.set(userId, {
			leadCount: leadMap.get(userId) ?? 0,
			collabCount: collabMap.get(userId) ?? 0,
		});
	}
	return result;
}

// ── 4. getMoaRepository ──
export async function getMoaRepository(query: {
	page: number;
	limit: number;
	search?: string | undefined;
	status?: string | undefined;
}) {
	const { page, limit, search, status } = query;
	const offset = (page - 1) * limit;
	const now = new Date();
	const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

	const whereConditions: (SQL | undefined)[] = [isNull(moas.archivedAt)];

	if (search) {
		whereConditions.push(ilike(partners.partnerName, `${search}%`));
	}

	if (status) {
		const thirtyDaysFromNow = new Date(
			now.getTime() + 30 * 24 * 60 * 60 * 1000,
		);

		switch (status) {
			case "Valid":
				whereConditions.push(
					and(
						sql`${moas.validUntil} > ${now.toISOString()}`,
						sql`${moas.validUntil} > ${thirtyDaysFromNow.toISOString()}`,
					),
				);
				break;
			case "Renewal Needed":
				whereConditions.push(
					and(
						sql`${moas.validUntil} > ${now.toISOString()}`,
						sql`${moas.validUntil} <= ${thirtyDaysFromNow.toISOString()}`,
					),
				);
				break;
			case "Expired":
				whereConditions.push(sql`${moas.validUntil} <= ${now.toISOString()}`);
				break;
		}
	}

	const queryBuilder = db
		.select({
			moaId: moas.moaId,
			partnerName: partners.partnerName,
			validFrom: moas.validFrom,
			validUntil: moas.validUntil,
		})
		.from(moas)
		.innerJoin(partners, eq(moas.partnerId, partners.partnerId))
		.where(and(...whereConditions))
		.orderBy(desc(moas.validUntil));

	const rows = await queryBuilder.limit(limit).offset(offset);
	const totalResult = await db
		.select({ value: count() })
		.from(moas)
		.innerJoin(partners, eq(moas.partnerId, partners.partnerId))
		.where(and(...whereConditions));

	const [totalMoasCount, expiringSoonCount, activeCount] = await Promise.all([
		db.select({ value: count() }).from(moas).where(isNull(moas.archivedAt)),
		db
			.select({ value: count() })
			.from(moas)
			.where(
				and(
					isNull(moas.archivedAt),
					sql`${moas.validUntil} > ${now.toISOString()}`,
					sql`${moas.validUntil} <= ${ninetyDaysFromNow.toISOString()}`,
				),
			),
		db
			.select({ value: count() })
			.from(moas)
			.where(
				and(
					isNull(moas.archivedAt),
					sql`${moas.validUntil} > ${now.toISOString()}`,
				),
			),
	]);

	const items = rows.map((r) => {
		const daysUntilExpiry = Math.ceil(
			(r.validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
		);

		let moaStatus: "Valid" | "Renewal Needed" | "Expired" = "Valid";
		if (r.validUntil < now) {
			moaStatus = "Expired";
		} else if (daysUntilExpiry <= 30) {
			moaStatus = "Renewal Needed";
		}

		return {
			id: r.moaId,
			partnerOrganization: r.partnerName,
			dateSigned: r.validFrom.toISOString(),
			daysToExpiry: daysUntilExpiry < 0 ? "Expired" : daysUntilExpiry,
			status: moaStatus,
		};
	});

	return {
		items,
		total: Number(totalResult[0]?.value ?? 0),
		metrics: {
			totalMoas: Number(totalMoasCount[0]?.value ?? 0),
			expiringWithin90Days: Number(expiringSoonCount[0]?.value ?? 0),
			activePartnerships: Number(activeCount[0]?.value ?? 0),
		},
	};
}

// ── 5. getActiveMoas ──
export async function getActiveMoas() {
	const rows = await db
		.select({
			moaId: moas.moaId,
			partnerName: partners.partnerName,
			validFrom: moas.validFrom,
			validUntil: moas.validUntil,
		})
		.from(moas)
		.innerJoin(partners, eq(moas.partnerId, partners.partnerId))
		.where(isNull(moas.archivedAt))
		.orderBy(desc(moas.createdAt));

	return rows.map((r) => ({
		moaId: r.moaId,
		partnerName: r.partnerName,
		validFrom: r.validFrom.toISOString(),
		validUntil: r.validUntil.toISOString(),
	}));
}

// ── 6. getHubProjects ──
export async function getHubProjects(
	query: {
		page: number;
		limit: number;
		search?: string | undefined;
		college?: string | undefined;
		status?: string | undefined;
		myProjectsOnly?: string | undefined;
	},
	user: AuthUser,
) {
	const { page, limit, search, college, status, myProjectsOnly } = query;
	const offset = (page - 1) * limit;

	const leaderMembersSubquery = getLeaderSubquery();

	const whereConditions = [
		isNull(proposals.archivedAt),
		or(
			eq(proposals.status, PROPOSAL_STATUS.ENDORSED),
			eq(proposals.status, PROPOSAL_STATUS.APPROVED),
			eq(proposals.status, PROPOSAL_STATUS.RETURNED),
			eq(proposals.status, PROPOSAL_STATUS.REJECTED),
			and(
				eq(proposals.status, PROPOSAL_STATUS.PENDING_REVIEW),
				eq(proposals.bypassedRetChair, true),
			),
		),
	];

	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			whereConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			whereConditions.push(eq(proposals.campusId, user.campusId));
		}
		whereConditions.push(
			inArray(projects.projectStatus, [
				PROJECT_STATUS.APPROVED,
				PROJECT_STATUS.ONGOING,
				PROJECT_STATUS.PENDING_CLOSURE,
				PROJECT_STATUS.OVERDUE,
			]),
		);
	}

	if (search) {
		whereConditions.push(
			or(
				ilike(proposals.title, `${search}%`),
				ilike(users.firstName, `${search}%`),
				ilike(users.lastName, `${search}%`),
			),
		);
	}

	if (college) {
		whereConditions.push(eq(departments.departmentName, college));
	}

	if (status) {
		if (Object.values(PROJECT_STATUS).includes(status as ProjectStatus)) {
			whereConditions.push(eq(projects.projectStatus, status));
		} else {
			whereConditions.push(eq(proposals.status, status));
		}
	}

	if (myProjectsOnly === "true") {
		whereConditions.push(eq(leaderMembersSubquery.userId, user.userId));
	}

	const latestReportsSubquery = db
		.select({
			projectId: projectReports.projectId,
			lastReportDate: sql<Date>`max(${projectReports.submittedAt})`.as(
				"last_report_date",
			),
		})
		.from(projectReports)
		.where(isNull(projectReports.archivedAt))
		.groupBy(projectReports.projectId)
		.as("latest_reports");

	const queryBuilder = db
		.select({
			id: proposals.proposalId,
			title: proposals.title,
			leaderFirstName: users.firstName,
			leaderLastName: users.lastName,
			leaderRank: users.academicRank,
			college: departments.departmentName,
			dateSubmitted: proposals.createdAt,
			proposalStatus: proposals.status,
			projectStatus: projects.projectStatus,
			lastReportDate: latestReportsSubquery.lastReportDate,
		})
		.from(proposals)
		.innerJoin(
			leaderMembersSubquery,
			eq(proposals.proposalId, leaderMembersSubquery.proposalId),
		)
		.innerJoin(users, eq(leaderMembersSubquery.userId, users.userId))
		.leftJoin(departments, eq(proposals.departmentId, departments.departmentId))
		.leftJoin(projects, eq(proposals.proposalId, projects.proposalId))
		.leftJoin(
			latestReportsSubquery,
			eq(projects.projectId, latestReportsSubquery.projectId),
		)
		.where(and(...whereConditions))
		.orderBy(desc(proposals.createdAt));

	const totalResult = await db
		.select({ value: count() })
		.from(proposals)
		.innerJoin(
			leaderMembersSubquery,
			eq(proposals.proposalId, leaderMembersSubquery.proposalId),
		)
		.innerJoin(users, eq(leaderMembersSubquery.userId, users.userId))
		.leftJoin(departments, eq(proposals.departmentId, departments.departmentId))
		.leftJoin(projects, eq(proposals.proposalId, projects.proposalId))
		.where(and(...whereConditions));

	const rows = await queryBuilder.limit(limit).offset(offset);

	const items = rows.map((r) => ({
		id: r.id,
		title: r.title,
		leaderName: `${r.leaderFirstName} ${r.leaderLastName}`,
		leaderRank: r.leaderRank,
		college: r.college,
		dateSubmitted: new Date(r.dateSubmitted).toISOString(),
		lastReportDate: r.lastReportDate
			? new Date(r.lastReportDate).toISOString()
			: null,
		status: r.projectStatus || r.proposalStatus,
		type: (r.projectStatus ? "Project" : "Proposal") as "Project" | "Proposal",
	}));

	return { items, total: Number(totalResult[0]?.value ?? 0) };
}

// ── 8. sendEmailReport ──
export async function sendEmailReport(
	body: {
		search?: string | undefined;
		college?: string | undefined;
		status?: string | undefined;
	},
	user: AuthUser,
): Promise<void> {
	const { search, college, status } = body;

	const whereConditions: (SQL | undefined)[] = [
		inArray(roles.roleName, [ROLE_NAMES.FACULTY, ROLE_NAMES.RET_CHAIR]),
	];

	if (status === "pending") {
		whereConditions.push(eq(users.isActive, false));
	} else {
		whereConditions.push(eq(users.isActive, true));
	}

	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			whereConditions.push(eq(users.departmentId, user.departmentId));
		} else {
			whereConditions.push(eq(users.campusId, user.campusId));
		}
	}

	if (search) {
		whereConditions.push(
			or(
				ilike(users.firstName, `${search}%`),
				ilike(users.lastName, `${search}%`),
			),
		);
	}

	if (college) {
		whereConditions.push(eq(departments.departmentName, college));
	}

	const rows = await db
		.select({
			userId: users.userId,
			firstName: users.firstName,
			lastName: users.lastName,
			academicRank: users.academicRank,
			college: departments.departmentName,
			departmentCode: departments.departmentCode,
			campusName: campuses.campusName,
			isMainCampus: campuses.isMainCampus,
		})
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.leftJoin(departments, eq(users.departmentId, departments.departmentId))
		.leftJoin(campuses, eq(users.campusId, campuses.campusId))
		.where(and(...whereConditions))
		.orderBy(users.lastName);

	const userIds = rows.map((r) => r.userId);

	const involvementCounts = await getFacultyInvolvementCounts(userIds);

	const items = rows.map((row) => {
		const counts = involvementCounts.get(row.userId) ?? {
			leadCount: 0,
			collabCount: 0,
		};
		return {
			...row,
			leadProjects: counts.leadCount,
			collaboratorProjects: counts.collabCount,
			totalInvolvement: counts.leadCount + counts.collabCount,
		};
	});

	const academicRankLabels: Record<string, string> = {
		"instructor-1": "Instructor I",
		"instructor-2": "Instructor II",
		"instructor-3": "Instructor III",
		"assistant-prof-1": "Assistant Professor I",
		"assistant-prof-2": "Assistant Professor II",
		"associate-prof-1": "Associate Professor I",
		"associate-prof-2": "Associate Professor II",
		"professor-1": "Professor I",
	};
	const formatRank = (rank: string | null): string => {
		if (!rank) return "Faculty";
		return academicRankLabels[rank] ?? rank;
	};

	const htmlReport = `
		<html>
			<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px;">
				<div style="background-color: #11215a; color: #ffffff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
					<h1 style="margin: 0; font-size: 24px;">Faculty Directory Report</h1>
					<p style="margin: 5px 0 0; font-size: 14px; opacity: 0.8;">NEUST Extension Services</p>
				</div>
				<div style="padding: 20px; border: 1px solid #ebebeb; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
					<p>Dear Director,</p>
					<p>As requested, here is the compiled Faculty Directory Report matching your active search and filter criteria. You can find the summarized data in the table below:</p>
					
					<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
						<thead>
							<tr style="background-color: #f4f7fc; border-bottom: 2px solid #ddd; color: #11215a; text-align: left;">
								<th style="padding: 10px; border: 1px solid #ddd;">Rank</th>
								<th style="padding: 10px; border: 1px solid #ddd;">Faculty Name</th>
								<th style="padding: 10px; border: 1px solid #ddd;">Academic Rank</th>
								<th style="padding: 10px; border: 1px solid #ddd;">Department</th>
								<th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Lead</th>
								<th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Collab</th>
								<th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
							</tr>
						</thead>
						<tbody>
							${items
								.map(
									(faculty, index) => `
								<tr style="border-bottom: 1px solid #ddd; background-color: ${index % 2 === 0 ? "#ffffff" : "#f9f9f9"};">
									<td style="padding: 8px 10px; border: 1px solid #ddd;">${index + 1}</td>
									<td style="padding: 8px 10px; border: 1px solid #ddd; font-weight: bold;">${faculty.firstName} ${faculty.lastName}</td>
									<td style="padding: 8px 10px; border: 1px solid #ddd;">${formatRank(faculty.academicRank)}</td>
									<td style="padding: 8px 10px; border: 1px solid #ddd;">
										${faculty.departmentCode ?? faculty.college ?? ""}
										${faculty.isMainCampus === false && faculty.campusName ? `<br/><span style="font-size: 11px; color: #666;">(${faculty.campusName})</span>` : ""}
									</td>
									<td style="padding: 8px 10px; border: 1px solid #ddd; text-align: right;">${faculty.leadProjects}</td>
									<td style="padding: 8px 10px; border: 1px solid #ddd; text-align: right;">${faculty.collaboratorProjects}</td>
									<td style="padding: 8px 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${faculty.totalInvolvement}</td>
								</tr>
							`,
								)
								.join("")}
						</tbody>
					</table>

					<p style="margin-top: 30px;">Thank you,</p>
					<p style="font-weight: bold; margin-bottom: 0;">NEUST Extension Services</p>
					<p style="font-size: 12px; color: #999; margin-top: 5px;">This email is an automated transmission requested from your active user dashboard session.</p>
				</div>
			</body>
		</html>
	`;

	const { Resend } = await import("resend");
	const resend = new Resend(env.RESEND_API_KEY);

	await resend.emails.send({
		from: env.RESEND_FROM ?? "noreply@neust.edu.ph",
		to: user.email,
		subject: `Faculty Directory Report - A.Y. 2024-2025`,
		html: htmlReport,
	});
}
