import type { SQL } from "drizzle-orm";
import { and, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db/client.js";
import { projectReportingDates } from "@/db/schema/project-reporting-dates.js";
import { projectReportingSchedules } from "@/db/schema/project-reporting-schedules.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { users } from "@/db/schema/users.js";
import {
	deriveProjectState,
	deriveProposalState,
} from "@/lib/derived-states.js";
import {
	PROJECT_STATUS,
	PROPOSAL_STATUS,
	type ProjectStatus,
	type ProposalStatus,
	ROLE_NAMES,
	type AuthUser,
} from "@/lib/types.js";
import type { z } from "@hono/zod-openapi";
import type { ActionItemSchema } from "./action-center.schema.js";

type ActionItem = z.infer<typeof ActionItemSchema>;

// ── Shared helpers ──

function buildLeaderSubquery() {
	return db
		.select({
			proposalId: proposalMembers.proposalId,
			userId: proposalMembers.userId,
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.projectRole, "Project Leader"))
		.as("leader_members");
}

function buildScopeClause(user: AuthUser): SQL | undefined {
	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		return user.isMainCampus && user.departmentId !== null
			? eq(proposals.departmentId, user.departmentId)
			: eq(proposals.campusId, user.campusId);
	}
	return undefined;
}

// ── Unified queries ──

async function getPendingProposals(
	opts: {
		statusFilter: SQL;
		scopeClause?: SQL;
		joinWithMember?: boolean;
		deriveOptions?: {
			isRtChair?: boolean;
			isDirector?: boolean;
			hasReviewed?: boolean;
		};
	},
) {
	const leaderSubquery = buildLeaderSubquery();
	const query = db
		.select({
			proposalId: proposals.proposalId,
			title: proposals.title,
			status: proposals.status,
			bypassedRetChair: proposals.bypassedRetChair,
			createdAt: proposals.createdAt,
			campusId: proposals.campusId,
			departmentId: proposals.departmentId,
			leaderId: leaderSubquery.userId,
		})
		.from(proposals)
		.leftJoin(
			leaderSubquery,
			eq(proposals.proposalId, leaderSubquery.proposalId),
		);

	const conditions: SQL[] = [
		opts.statusFilter,
		isNull(proposals.archivedAt),
	];
	if (opts.scopeClause) conditions.push(opts.scopeClause);
	if (opts.joinWithMember) {
		query.innerJoin(
			proposalMembers,
			eq(proposals.proposalId, proposalMembers.proposalId),
		);
	}

	return query.where(and(...conditions));
}

async function getReturnedProposals(
	opts: {
		scopeClause?: SQL;
		joinWithMember?: boolean;
		deriveOptions?: {
			isRtChair?: boolean;
			isDirector?: boolean;
			hasReviewed?: boolean;
		};
	},
) {
	const leaderSubquery = buildLeaderSubquery();
	const query = db
		.select({
			proposalId: proposals.proposalId,
			title: proposals.title,
			status: proposals.status,
			bypassedRetChair: proposals.bypassedRetChair,
			createdAt: proposals.createdAt,
			campusId: proposals.campusId,
			departmentId: proposals.departmentId,
			leaderId: leaderSubquery.userId,
		})
		.from(proposals)
		.leftJoin(
			leaderSubquery,
			eq(proposals.proposalId, leaderSubquery.proposalId),
		);

	const conditions: SQL[] = [
		eq(proposals.status, PROPOSAL_STATUS.RETURNED),
		isNull(proposals.archivedAt),
	];
	if (opts.scopeClause) conditions.push(opts.scopeClause);
	if (opts.joinWithMember) {
		query.innerJoin(
			proposalMembers,
			eq(proposals.proposalId, proposalMembers.proposalId),
		);
	}

	return query.where(and(...conditions));
}

async function getProjectsByStatus(
	opts: {
		projectStatus: ProjectStatus;
		scopeClause?: SQL;
		joinWithMember?: boolean;
	},
) {
	const leaderSubquery = buildLeaderSubquery();
	const query = db
		.select({
			proposalId: proposals.proposalId,
			projectId: projects.projectId,
			title: proposals.title,
			projectStatus: projects.projectStatus,
			moaId: projects.moaId,
			createdAt: projects.createdAt,
			leaderId: leaderSubquery.userId,
		})
		.from(projects)
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.leftJoin(
			leaderSubquery,
			eq(proposals.proposalId, leaderSubquery.proposalId),
		);

	const conditions: SQL[] = [
		eq(projects.projectStatus, opts.projectStatus),
		isNull(projects.archivedAt),
	];
	if (opts.scopeClause) conditions.push(opts.scopeClause);
	if (opts.joinWithMember) {
		query.innerJoin(
			proposalMembers,
			eq(proposals.proposalId, proposalMembers.proposalId),
		);
	}

	return query.where(and(...conditions));
}

async function getUpcomingReports(
	opts: {
		now: Date;
		scopeClause?: SQL;
		joinWithMember?: boolean;
	},
) {
	const leaderSubquery = buildLeaderSubquery();
	const query = db
		.select({
			dateId: projectReportingDates.id,
			reportingDate: projectReportingDates.reportingDate,
			title: proposals.title,
			proposalId: projects.proposalId,
			projectStatus: projects.projectStatus,
			moaId: projects.moaId,
			createdAt: projectReportingDates.createdAt,
			leaderId: leaderSubquery.userId,
		})
		.from(projectReportingDates)
		.innerJoin(
			projectReportingSchedules,
			eq(
				projectReportingDates.scheduleId,
				projectReportingSchedules.scheduleId,
			),
		)
		.innerJoin(
			projects,
			eq(projectReportingSchedules.projectId, projects.projectId),
		)
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.leftJoin(
			leaderSubquery,
			eq(proposals.proposalId, leaderSubquery.proposalId),
		);

	const conditions: SQL[] = [
		eq(projectReportingDates.isCompleted, false),
		gte(projectReportingDates.reportingDate, opts.now),
		isNull(projects.archivedAt),
	];
	if (opts.scopeClause) conditions.push(opts.scopeClause);
	if (opts.joinWithMember) {
		query.innerJoin(
			proposalMembers,
			eq(proposals.proposalId, proposalMembers.proposalId),
		);
	}

	return query.where(and(...conditions));
}

async function batchFetchScheduleExists(
	projectIds: string[],
): Promise<Map<string, boolean>> {
	if (projectIds.length === 0) return new Map();
	const rows = await db
		.select({ projectId: projectReportingSchedules.projectId })
		.from(projectReportingSchedules)
		.where(inArray(projectReportingSchedules.projectId, projectIds));
	return new Map(rows.map((r) => [r.projectId, true]));
}

async function getPendingRegistrations() {
	return db
		.select({
			userId: users.userId,
			firstName: users.firstName,
			lastName: users.lastName,
			createdAt: users.createdAt,
		})
		.from(users)
		.where(eq(users.isActive, false));
}

// ── Item builders ──

function buildProposalItem(
	prop: {
		proposalId: string;
		title: string;
		status: string;
		bypassedRetChair: boolean;
		createdAt: Date;
		campusId: number;
		departmentId: number | null;
		leaderId: string | null;
	},
	user: AuthUser,
	urgency: "urgent" | "soon" | "routine",
	deriveOptions?: {
		isRtChair?: boolean;
		isDirector?: boolean;
		hasReviewed?: boolean;
	},
): ActionItem {
	const derived = deriveProposalState(
		{
			status: prop.status as ProposalStatus,
			bypassedRetChair: prop.bypassedRetChair,
			leaderId: prop.leaderId ?? undefined,
			campusId: prop.campusId,
			departmentId: prop.departmentId,
		},
		user,
		deriveOptions,
	);

	return {
		id: prop.proposalId,
		type: "proposal",
		title: prop.title,
		status: prop.status,
		actionRequired: derived.nextTransition,
		owner: derived.owner,
		derivedState: derived.state,
		createdAt: prop.createdAt.toISOString(),
		urgency,
	};
}

function buildProjectItem(
	proj: {
		proposalId: string;
		title: string | null;
		projectStatus: string;
		moaId: string | null;
		createdAt: Date;
		leaderId: string | null;
	},
	user: AuthUser,
	scheduleExists: boolean,
	opts?: {
		urgency?: "urgent" | "soon" | "routine";
		actionRequiredOverride?: string;
	},
): ActionItem {
	const derived = deriveProjectState(
		{
			projectStatus: proj.projectStatus as ProjectStatus,
			moaId: proj.moaId,
			reportingSchedule: scheduleExists,
			leaderId: proj.leaderId ?? undefined,
		},
		user,
	);

	return {
		id: proj.proposalId,
		type: "project",
		title: proj.title ?? "Untitled Project",
		status: proj.projectStatus,
		actionRequired: opts?.actionRequiredOverride ?? derived.nextTransition,
		owner: derived.owner,
		derivedState: derived.state,
		createdAt: proj.createdAt.toISOString(),
		urgency:
			opts?.urgency ??
			(derived.state === "ACT" ? ("soon" as const) : ("routine" as const)),
	};
}

function buildReportItem(
	rep: {
		dateId: string;
		reportingDate: Date;
		title: string;
		proposalId: string;
		createdAt: Date;
	},
	now: Date,
	roleName: string,
): ActionItem {
	const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

	const urgency =
		rep.reportingDate <= sevenDays
			? ("urgent" as const)
			: rep.reportingDate <= thirtyDays
				? ("soon" as const)
				: ("routine" as const);

	const isFaculty = roleName === ROLE_NAMES.FACULTY;
	const derivedState =
		isFaculty && urgency === "routine"
			? ("WATCH" as const)
			: urgency === "urgent"
				? ("ACT" as const)
				: ("WATCH" as const);

	return {
		id: rep.proposalId,
		dateId: rep.dateId,
		type: "report",
		title: isFaculty
			? `Report deadline for ${rep.title}`
			: `Report Obligation for ${rep.title}`,
		status: "Upcoming",
		actionRequired: isFaculty
			? `Submit progress report by ${rep.reportingDate.toLocaleDateString()}`
			: `Submit report by ${rep.reportingDate.toLocaleDateString()}`,
		owner: isFaculty ? "You" : "Project Leader",
		derivedState,
		createdAt: rep.createdAt.toISOString(),
		urgency,
	};
}

// ── Orchestrator ──

export async function getActionItemsForRole(
	user: AuthUser,
): Promise<{
	actItems: ActionItem[];
	watchItems: ActionItem[];
	stats: {
		pendingReviews: number;
		returnedProposals: number;
		overdueReports: number;
		expiringMoas: number;
		projectsNeedingActivation: number;
	};
}> {
	const now = new Date();
	const actItems: ActionItem[] = [];
	const watchItems: ActionItem[] = [];

	let pendingReviews = 0;
	let returnedProposals = 0;
	let overdueReports = 0;
	let projectsNeedingActivation = 0;

	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		const scope = buildScopeClause(user);
		const scopeProps = scope !== undefined ? { scopeClause: scope } : {};

		const pending = await getPendingProposals({
			statusFilter: and(
				eq(proposals.status, PROPOSAL_STATUS.PENDING_REVIEW),
				eq(proposals.bypassedRetChair, false),
			)!,
			...scopeProps,
			deriveOptions: { isRtChair: true, hasReviewed: false },
		});
		pendingReviews = pending.length;
		for (const p of pending) {
			const item = buildProposalItem(p, user, "soon", {
				isRtChair: true,
				hasReviewed: false,
			});
			(item.derivedState === "ACT" ? actItems : watchItems).push(item);
		}

		const returned = await getReturnedProposals({
			...scopeProps,
			deriveOptions: { isRtChair: true },
		});
		returnedProposals = returned.length;
		for (const p of returned) {
			const item = buildProposalItem(p, user, "routine", { isRtChair: true });
			(item.derivedState === "ACT" ? actItems : watchItems).push(item);
		}

		const overdue = await getProjectsByStatus({
			projectStatus: PROJECT_STATUS.OVERDUE,
			...scopeProps,
		});
		overdueReports = overdue.length;
		const schedMap = await batchFetchScheduleExists(
			overdue.map((p) => p.projectId),
		);
		for (const p of overdue) {
			const item = buildProjectItem(p, user, schedMap.get(p.projectId) ?? false, {
				urgency: "urgent",
			});
			(item.derivedState === "ACT" ? actItems : watchItems).push(item);
		}

		const reports = await getUpcomingReports({ now, ...scopeProps });
		for (const r of reports) {
			const item = buildReportItem(r, now, user.roleName);
			(item.derivedState === "ACT" ? actItems : watchItems).push(item);
		}
	} else if (user.roleName === ROLE_NAMES.DIRECTOR) {
		const pending = await getPendingProposals({
			statusFilter: or(
				eq(proposals.status, PROPOSAL_STATUS.ENDORSED),
				and(
					eq(proposals.status, PROPOSAL_STATUS.PENDING_REVIEW),
					eq(proposals.bypassedRetChair, true),
				),
			)!,
			deriveOptions: { isDirector: true, hasReviewed: false },
		});
		pendingReviews = pending.length;
		for (const p of pending) {
			const item = buildProposalItem(p, user, "soon", {
				isDirector: true,
				hasReviewed: false,
			});
			(item.derivedState === "ACT" ? actItems : watchItems).push(item);
		}

		const approved = await getProjectsByStatus({
			projectStatus: PROJECT_STATUS.APPROVED,
		});
		projectsNeedingActivation = approved.length;
		const approvedSchedMap = await batchFetchScheduleExists(
			approved.map((p) => p.projectId),
		);
		for (const p of approved) {
			const derived = deriveProjectState(
				{
					projectStatus: p.projectStatus as ProjectStatus,
					moaId: p.moaId,
					reportingSchedule: approvedSchedMap.get(p.projectId) ?? false,
					leaderId: p.leaderId ?? undefined,
				},
				user,
			);
			const item = buildProjectItem(
				p,
				user,
				approvedSchedMap.get(p.projectId) ?? false,
				{
					actionRequiredOverride:
						derived.state === "ACT" ? derived.nextTransition : derived.reason,
				},
			);
			(item.derivedState === "ACT" ? actItems : watchItems).push(item);
		}

		const overdue = await getProjectsByStatus({
			projectStatus: PROJECT_STATUS.OVERDUE,
		});
		overdueReports = overdue.length;
		const overdueSchedMap = await batchFetchScheduleExists(
			overdue.map((p) => p.projectId),
		);
		for (const p of overdue) {
			const item = buildProjectItem(
				p,
				user,
				overdueSchedMap.get(p.projectId) ?? false,
				{ urgency: "urgent" },
			);
			(item.derivedState === "ACT" ? actItems : watchItems).push(item);
		}

		const reports = await getUpcomingReports({ now });
		for (const r of reports) {
			const item = buildReportItem(r, now, user.roleName);
			(item.derivedState === "ACT" ? actItems : watchItems).push(item);
		}
	} else if (user.roleName === ROLE_NAMES.FACULTY) {
		const returned = await getReturnedProposals({
			joinWithMember: true,
		});
		returnedProposals = returned.length;
		for (const p of returned) {
			const item = buildProposalItem(p, user, "urgent");
			(item.derivedState === "ACT" ? actItems : watchItems).push(item);
		}

		const overdue = await getProjectsByStatus({
			projectStatus: PROJECT_STATUS.OVERDUE,
			joinWithMember: true,
		});
		overdueReports = overdue.length;
		const schedMap = await batchFetchScheduleExists(
			overdue.map((p) => p.projectId),
		);
		for (const p of overdue) {
			const item = buildProjectItem(p, user, schedMap.get(p.projectId) ?? false, {
				urgency: "urgent",
			});
			(item.derivedState === "ACT" ? actItems : watchItems).push(item);
		}

		const reports = await getUpcomingReports({
			now,
			joinWithMember: true,
		});
		for (const r of reports) {
			const item = buildReportItem(r, now, user.roleName);
			(item.derivedState === "ACT" ? actItems : watchItems).push(item);
		}
	} else if (user.roleName === ROLE_NAMES.SUPER_ADMIN) {
		const pendingUsers = await getPendingRegistrations();
		for (const u of pendingUsers) {
			actItems.push({
				id: u.userId,
				type: "registration",
				title: `Registration Request: ${u.firstName} ${u.lastName}`,
				status: "Pending",
				actionRequired: "Approve or deny account registration",
				owner: "Super Admin",
				derivedState: "ACT",
				createdAt: u.createdAt.toISOString(),
				urgency: "soon",
			});
		}
	}

	return {
		actItems,
		watchItems,
		stats: {
			pendingReviews,
			returnedProposals,
			overdueReports,
			expiringMoas: 0,
			projectsNeedingActivation,
		},
	};
}
