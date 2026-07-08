import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	and,
	eq,
	gte,
	isNull,
	or,
} from "drizzle-orm";
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
import { installApiErrorHandler } from "@/lib/errors.js";
import {
	PROJECT_STATUS,
	PROPOSAL_STATUS,
	type ProjectStatus,
	type ProposalStatus,
	ROLE_NAMES,
} from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

app.use("/action-center", authMiddleware);
app.use("/action-center/*", authMiddleware);

const ActionItemSchema = z
	.object({
		id: z.string(),
		dateId: z.string().optional(),
		type: z.enum(["proposal", "project", "moa", "report", "registration"]),
		title: z.string(),
		status: z.string(),
		actionRequired: z.string(),
		owner: z.string(),
		derivedState: z.enum(["ACT", "WAIT", "WATCH"]),
		createdAt: z.string(),
		urgency: z.enum(["urgent", "soon", "routine"]),
	})
	.openapi("ActionItem");

const ActionCenterResponseSchema = z
	.object({
		actItems: z.array(ActionItemSchema),
		watchItems: z.array(ActionItemSchema),
		stats: z.object({
			pendingReviews: z.number(),
			returnedProposals: z.number(),
			overdueReports: z.number(),
			expiringMoas: z.number(),
			projectsNeedingActivation: z.number(),
		}),
	})
	.openapi("ActionCenterResponse");

const getActionCenterRoute = createRoute({
	method: "get",
	path: "/action-center",
	tags: ["Action Center"],
	summary:
		"Get aggregated actionable and monitored items for the authenticated user",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: ActionCenterResponseSchema } },
			description: "Prioritized task queue and operational stats",
		},
	},
});

app.openapi(getActionCenterRoute, async (c) => {
	const user = c.get("user");
	const now = new Date();
	const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

	const actItems: z.infer<typeof ActionItemSchema>[] = [];
	const watchItems: z.infer<typeof ActionItemSchema>[] = [];

	let pendingReviews = 0;
	let returnedProposals = 0;
	let overdueReports = 0;
	const expiringMoas = 0;
	let projectsNeedingActivation = 0;

	// Subquery to retrieve project leader ID
	const leaderSubquery = db
		.select({
			proposalId: proposalMembers.proposalId,
			userId: proposalMembers.userId,
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.projectRole, "Project Leader"))
		.as("leader_members");

	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		const scopeClause =
			user.isMainCampus && user.departmentId !== null
				? eq(proposals.departmentId, user.departmentId)
				: eq(proposals.campusId, user.campusId);

		// 1. Proposals pending endorsement
		const pendingProposals = await db
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
			)
			.where(
				and(
					eq(proposals.status, PROPOSAL_STATUS.PENDING_REVIEW),
					eq(proposals.bypassedRetChair, false),
					isNull(proposals.archivedAt),
					scopeClause,
				),
			);

		pendingReviews = pendingProposals.length;

		for (const prop of pendingProposals) {
			const derived = deriveProposalState(
				{
					status: prop.status as ProposalStatus,
					bypassedRetChair: prop.bypassedRetChair,
					leaderId: prop.leaderId ?? undefined,
					campusId: prop.campusId,
					departmentId: prop.departmentId,
				},
				user,
				{ isRtChair: true, hasReviewed: false },
			);

			const item = {
				id: prop.proposalId,
				type: "proposal" as const,
				title: prop.title,
				status: prop.status,
				actionRequired: derived.nextTransition,
				owner: derived.owner,
				derivedState: derived.state,
				createdAt: prop.createdAt.toISOString(),
				urgency: "soon" as const,
			};

			if (derived.state === "ACT") actItems.push(item);
			else watchItems.push(item);
		}

		// 2. Returned proposals (waiting for faculty resubmission)
		const returnedProps = await db
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
			)
			.where(
				and(
					eq(proposals.status, PROPOSAL_STATUS.RETURNED),
					isNull(proposals.archivedAt),
					scopeClause,
				),
			);

		returnedProposals = returnedProps.length;

		for (const prop of returnedProps) {
			const derived = deriveProposalState(
				{
					status: prop.status as ProposalStatus,
					bypassedRetChair: prop.bypassedRetChair,
					leaderId: prop.leaderId ?? undefined,
					campusId: prop.campusId,
					departmentId: prop.departmentId,
				},
				user,
				{ isRtChair: true },
			);

			const item = {
				id: prop.proposalId,
				type: "proposal" as const,
				title: prop.title,
				status: prop.status,
				actionRequired: derived.nextTransition,
				owner: derived.owner,
				derivedState: derived.state,
				createdAt: prop.createdAt.toISOString(),
				urgency: "routine" as const,
			};

			if (derived.state === "ACT") actItems.push(item);
			else watchItems.push(item);
		}

		// 3. Overdue projects in college
		const overdueProjects = await db
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
			)
			.where(
				and(
					eq(projects.projectStatus, PROJECT_STATUS.OVERDUE),
					isNull(projects.archivedAt),
					scopeClause,
				),
			);

		overdueReports = overdueProjects.length;

		for (const proj of overdueProjects) {
			// Query if schedule exists
			const [sched] = await db
				.select({ scheduleId: projectReportingSchedules.scheduleId })
				.from(projectReportingSchedules)
				.where(eq(projectReportingSchedules.projectId, proj.projectId))
				.limit(1);

			const derived = deriveProjectState(
				{
					projectStatus: proj.projectStatus as ProjectStatus,
					moaId: proj.moaId,
					reportingSchedule: !!sched,
					leaderId: proj.leaderId ?? undefined,
				},
				user,
			);

			const item = {
				id: proj.proposalId,
				type: "project" as const,
				title: proj.title ?? "Untitled Project",
				status: proj.projectStatus,
				actionRequired: derived.nextTransition,
				owner: derived.owner,
				derivedState: derived.state,
				createdAt: proj.createdAt.toISOString(),
				urgency: "urgent" as const,
			};

			if (derived.state === "ACT") actItems.push(item);
			else watchItems.push(item);
		}

		// 4. Upcoming report deadlines
		const upcomingReports = await db
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
			)
			.where(
				and(
					eq(projectReportingDates.isCompleted, false),
					gte(projectReportingDates.reportingDate, now),
					isNull(projects.archivedAt),
					scopeClause,
				),
			);

		for (const rep of upcomingReports) {
			const urgency =
				rep.reportingDate <= sevenDays
					? ("urgent" as const)
					: rep.reportingDate <= thirtyDays
						? ("soon" as const)
						: ("routine" as const);
			const derivedState =
				urgency === "urgent" ? ("ACT" as const) : ("WATCH" as const);
			const item = {
				id: rep.proposalId,
				dateId: rep.dateId,
				type: "report" as const,
				title: `Report Obligation for ${rep.title}`,
				status: "Upcoming",
				actionRequired: `Submit report by ${rep.reportingDate.toLocaleDateString()}`,
				owner: "Project Leader",
				derivedState,
				createdAt: rep.createdAt.toISOString(),
				urgency,
			};
			if (derivedState === "ACT") actItems.push(item);
			else watchItems.push(item);
		}
	} else if (user.roleName === ROLE_NAMES.DIRECTOR) {
		// 1. Proposals pending approval (Endorsed OR bypassed RET Chair)
		const pendingProposals = await db
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
			)
			.where(
				and(
					or(
						eq(proposals.status, PROPOSAL_STATUS.ENDORSED),
						and(
							eq(proposals.status, PROPOSAL_STATUS.PENDING_REVIEW),
							eq(proposals.bypassedRetChair, true),
						),
					),
					isNull(proposals.archivedAt),
				),
			);

		pendingReviews = pendingProposals.length;

		for (const prop of pendingProposals) {
			const derived = deriveProposalState(
				{
					status: prop.status as ProposalStatus,
					bypassedRetChair: prop.bypassedRetChair,
					leaderId: prop.leaderId ?? undefined,
					campusId: prop.campusId,
					departmentId: prop.departmentId,
				},
				user,
				{ isDirector: true, hasReviewed: false },
			);

			const item = {
				id: prop.proposalId,
				type: "proposal" as const,
				title: prop.title,
				status: prop.status,
				actionRequired: derived.nextTransition,
				owner: derived.owner,
				derivedState: derived.state,
				createdAt: prop.createdAt.toISOString(),
				urgency: "soon" as const,
			};

			if (derived.state === "ACT") actItems.push(item);
			else watchItems.push(item);
		}

		// 2. Projects awaiting activation (Approved status)
		const approvedProjects = await db
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
			)
			.where(
				and(
					eq(projects.projectStatus, PROJECT_STATUS.APPROVED),
					isNull(projects.archivedAt),
				),
			);

		projectsNeedingActivation = approvedProjects.length;

		for (const proj of approvedProjects) {
			const [sched] = await db
				.select({ scheduleId: projectReportingSchedules.scheduleId })
				.from(projectReportingSchedules)
				.where(eq(projectReportingSchedules.projectId, proj.projectId))
				.limit(1);

			const derived = deriveProjectState(
				{
					projectStatus: proj.projectStatus as ProjectStatus,
					moaId: proj.moaId,
					reportingSchedule: !!sched,
					leaderId: proj.leaderId ?? undefined,
				},
				user,
			);

			const item = {
				id: proj.proposalId,
				type: "project" as const,
				title: proj.title ?? "Untitled Project",
				status: proj.projectStatus,
				actionRequired:
					derived.state === "ACT" ? derived.nextTransition : derived.reason,
				owner: derived.owner,
				derivedState: derived.state,
				createdAt: proj.createdAt.toISOString(),
				urgency:
					derived.state === "ACT" ? ("soon" as const) : ("routine" as const),
			};

			if (derived.state === "ACT") actItems.push(item);
			else watchItems.push(item);
		}

		// 3. Overdue projects (anywhere)
		const overdueProjects = await db
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
			)
			.where(
				and(
					eq(projects.projectStatus, PROJECT_STATUS.OVERDUE),
					isNull(projects.archivedAt),
				),
			);

		overdueReports = overdueProjects.length;

		for (const proj of overdueProjects) {
			const [sched] = await db
				.select({ scheduleId: projectReportingSchedules.scheduleId })
				.from(projectReportingSchedules)
				.where(eq(projectReportingSchedules.projectId, proj.projectId))
				.limit(1);

			const derived = deriveProjectState(
				{
					projectStatus: proj.projectStatus as ProjectStatus,
					moaId: proj.moaId,
					reportingSchedule: !!sched,
					leaderId: proj.leaderId ?? undefined,
				},
				user,
			);

			const item = {
				id: proj.proposalId,
				type: "project" as const,
				title: proj.title ?? "Untitled Project",
				status: proj.projectStatus,
				actionRequired: derived.nextTransition,
				owner: derived.owner,
				derivedState: derived.state,
				createdAt: proj.createdAt.toISOString(),
				urgency: "urgent" as const,
			};

			if (derived.state === "ACT") actItems.push(item);
			else watchItems.push(item);
		}

		// 4. Upcoming report deadlines (national scope)
		const upcomingReports = await db
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
			)
			.where(
				and(
					eq(projectReportingDates.isCompleted, false),
					gte(projectReportingDates.reportingDate, now),
					isNull(projects.archivedAt),
				),
			);

		for (const rep of upcomingReports) {
			const urgency =
				rep.reportingDate <= sevenDays
					? ("urgent" as const)
					: rep.reportingDate <= thirtyDays
						? ("soon" as const)
						: ("routine" as const);
			const derivedState =
				urgency === "urgent" ? ("ACT" as const) : ("WATCH" as const);
			const item = {
				id: rep.proposalId,
				dateId: rep.dateId,
				type: "report" as const,
				title: `Report Obligation for ${rep.title}`,
				status: "Upcoming",
				actionRequired: `Submit report by ${rep.reportingDate.toLocaleDateString()}`,
				owner: "Project Leader",
				derivedState,
				createdAt: rep.createdAt.toISOString(),
				urgency,
			};
			if (derivedState === "ACT") actItems.push(item);
			else watchItems.push(item);
		}
	} else if (user.roleName === ROLE_NAMES.FACULTY) {
		const leaderFilter = and(
			eq(proposalMembers.userId, user.userId),
			eq(proposalMembers.projectRole, "Project Leader"),
		);

		// 1. Returned proposals
		const returnedProps = await db
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
			.innerJoin(
				proposalMembers,
				eq(proposals.proposalId, proposalMembers.proposalId),
			)
			.leftJoin(
				leaderSubquery,
				eq(proposals.proposalId, leaderSubquery.proposalId),
			)
			.where(
				and(
					eq(proposals.status, PROPOSAL_STATUS.RETURNED),
					isNull(proposals.archivedAt),
					leaderFilter,
				),
			);

		returnedProposals = returnedProps.length;

		for (const prop of returnedProps) {
			const derived = deriveProposalState(
				{
					status: prop.status as ProposalStatus,
					bypassedRetChair: prop.bypassedRetChair,
					leaderId: prop.leaderId ?? undefined,
					campusId: prop.campusId,
					departmentId: prop.departmentId,
				},
				user,
			);

			const item = {
				id: prop.proposalId,
				type: "proposal" as const,
				title: prop.title,
				status: prop.status,
				actionRequired: derived.nextTransition,
				owner: derived.owner,
				derivedState: derived.state,
				createdAt: prop.createdAt.toISOString(),
				urgency: "urgent" as const,
			};

			if (derived.state === "ACT") actItems.push(item);
			else watchItems.push(item);
		}

		// 2. Overdue projects
		const overdueProjects = await db
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
			.innerJoin(
				proposalMembers,
				eq(proposals.proposalId, proposalMembers.proposalId),
			)
			.leftJoin(
				leaderSubquery,
				eq(proposals.proposalId, leaderSubquery.proposalId),
			)
			.where(
				and(
					eq(projects.projectStatus, PROJECT_STATUS.OVERDUE),
					isNull(projects.archivedAt),
					leaderFilter,
				),
			);

		overdueReports = overdueProjects.length;

		for (const proj of overdueProjects) {
			const [sched] = await db
				.select({ scheduleId: projectReportingSchedules.scheduleId })
				.from(projectReportingSchedules)
				.where(eq(projectReportingSchedules.projectId, proj.projectId))
				.limit(1);

			const derived = deriveProjectState(
				{
					projectStatus: proj.projectStatus as ProjectStatus,
					moaId: proj.moaId,
					reportingSchedule: !!sched,
					leaderId: proj.leaderId ?? undefined,
				},
				user,
			);

			const item = {
				id: proj.proposalId,
				type: "project" as const,
				title: proj.title ?? "Untitled Project",
				status: proj.projectStatus,
				actionRequired: derived.nextTransition,
				owner: derived.owner,
				derivedState: derived.state,
				createdAt: proj.createdAt.toISOString(),
				urgency: "urgent" as const,
			};

			if (derived.state === "ACT") actItems.push(item);
			else watchItems.push(item);
		}

		// 3. Upcoming report deadlines
		const upcomingReports = await db
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
			.innerJoin(
				proposalMembers,
				eq(proposals.proposalId, proposalMembers.proposalId),
			)
			.leftJoin(
				leaderSubquery,
				eq(proposals.proposalId, leaderSubquery.proposalId),
			)
			.where(
				and(
					eq(projectReportingDates.isCompleted, false),
					gte(projectReportingDates.reportingDate, now),
					isNull(projects.archivedAt),
					leaderFilter,
				),
			);

		for (const rep of upcomingReports) {
			const urgency =
				rep.reportingDate <= sevenDays
					? ("urgent" as const)
					: rep.reportingDate <= thirtyDays
						? ("soon" as const)
						: ("routine" as const);
			const derivedState =
				urgency === "routine" ? ("WATCH" as const) : ("ACT" as const);
			const item = {
				id: rep.proposalId,
				dateId: rep.dateId,
				type: "report" as const,
				title: `Report deadline for ${rep.title}`,
				status: "Upcoming",
				actionRequired: `Submit progress report by ${rep.reportingDate.toLocaleDateString()}`,
				owner: "You",
				derivedState,
				createdAt: rep.createdAt.toISOString(),
				urgency,
			};
			if (derivedState === "ACT") actItems.push(item);
			else watchItems.push(item);
		}
	} else if (user.roleName === ROLE_NAMES.SUPER_ADMIN) {
		// 1. Pending registrations
		const pendingUsers = await db
			.select({
				userId: users.userId,
				firstName: users.firstName,
				lastName: users.lastName,
				createdAt: users.createdAt,
			})
			.from(users)
			.where(eq(users.isActive, false));

		for (const u of pendingUsers) {
			const item = {
				id: u.userId,
				type: "registration" as const,
				title: `Registration Request: ${u.firstName} ${u.lastName}`,
				status: "Pending",
				actionRequired: "Approve or deny account registration",
				owner: "Super Admin",
				derivedState: "ACT" as const,
				createdAt: u.createdAt.toISOString(),
				urgency: "soon" as const,
			};
			actItems.push(item);
		}
	}

	return c.json(
		{
			actItems,
			watchItems,
			stats: {
				pendingReviews,
				returnedProposals,
				overdueReports,
				expiringMoas,
				projectsNeedingActivation,
			},
		},
		200,
	);
});

export default app;
