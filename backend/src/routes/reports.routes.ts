import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { departments } from "../db/schema/departments.js";
import { projectReports } from "../db/schema/project-reports.js";
import { projects } from "../db/schema/projects.js";
import { proposalMembers } from "../db/schema/proposal-members.js";
import { proposals } from "../db/schema/proposals.js";
import { users } from "../db/schema/users.js";
import { projectReportingSchedules } from "../db/schema/project-reporting-schedules.js";
import { projectReportingDates } from "../db/schema/project-reporting-dates.js";
import { insertAuditLog } from "../lib/audit.js";
import { getClientIp } from "../lib/client-ip.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";
import { createNotification, getUserIdsByRole } from "../lib/notification.helpers.js";
import { REPORT_TYPE, ROLE_NAMES } from "../lib/types.js";
import { type AuthEnv, authMiddleware } from "../middleware/auth.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

// ── Schemas ──
const ReportSchema = z
	.object({
		reportId: z.string(),
		projectId: z.string(),
		project: z.string(),
		leader: z.string(),
		department: z.string().nullable(),
		reportType: z.string(),
		submitted: z.string(),
		storagePath: z.string().nullable(),
		remarks: z.string().nullable(),
		periodStart: z.string().nullable(),
		periodEnd: z.string().nullable(),
		archivedAt: z.string().nullable(),
	})
	.openapi("ProjectReport");

const ReportListSchema = z
	.object({ items: z.array(ReportSchema), total: z.number() })
	.openapi("ProjectReportList");

const CreateReportSchema = z
	.object({
		projectId: z.string().uuid(),
		reportType: z.enum([
			REPORT_TYPE.PROGRESS,
			REPORT_TYPE.FINAL_ACCOMPLISHMENT,
			REPORT_TYPE.TERMINAL,
		]),
		remarks: z.string().optional(),
		periodStart: z.string().datetime().optional(),
		periodEnd: z.string().datetime().optional(),
	})
	.openapi("CreateReport");

const ReportStatsSchema = z
	.object({
		total: z.number(),
		progress: z.number(),
		terminal: z.number(),
	})
	.openapi("ReportStats");

const ErrorSchema = z
	.object({
		error: z.object({ code: z.string(), message: z.string() }),
	})
	.openapi("ReportError");

const MessageSchema = z
	.object({ message: z.string() })
	.openapi("ReportMessage");

const ParamId = z.object({
	id: z
		.string()
		.uuid()
		.openapi({ param: { name: "id", in: "path" } }),
});

const PaginationQuery = z.object({
	page: z.coerce
		.number()
		.int()
		.min(1)
		.default(1)
		.openapi({
			param: { name: "page", in: "query" },
		}),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(100)
		.default(50)
		.openapi({
			param: { name: "limit", in: "query" },
		}),
});

app.use("/reports/*", authMiddleware);
app.use("/reports", authMiddleware);

// ── GET /reports ──
const listRoute = createRoute({
	method: "get",
	path: "/reports",
	tags: ["Reports"],
	summary: "List all non-archived project reports",
	security: [{ Bearer: [] }],
	request: { query: PaginationQuery },
	responses: {
		200: {
			content: { "application/json": { schema: ReportListSchema } },
			description: "Report list",
		},
	},
});

app.openapi(listRoute, async (c) => {
	const user = c.get("user");
	const { page, limit } = c.req.valid("query");
	const offset = (page - 1) * limit;

	const whereConditions: SQL[] = [isNull(projectReports.archivedAt)];

	if (user.roleName === ROLE_NAMES.FACULTY) {
		if (user.departmentId !== null) {
			whereConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			whereConditions.push(eq(proposals.campusId, user.campusId));
		}
	} else if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			whereConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			whereConditions.push(eq(proposals.campusId, user.campusId));
		}
	}

	const rows = await db
		.select({
			reportId: projectReports.reportId,
			projectId: projectReports.projectId,
			projectTitle: proposals.title,
			leaderFirstName: users.firstName,
			leaderLastName: users.lastName,
			departmentName: departments.departmentName,
			reportType: projectReports.reportType,
			submittedAt: projectReports.submittedAt,
			storagePath: projectReports.storagePath,
			remarks: projectReports.remarks,
			periodStart: projectReports.periodStart,
			periodEnd: projectReports.periodEnd,
			archivedAt: projectReports.archivedAt,
		})
		.from(projectReports)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.innerJoin(users, eq(projectReports.submittedById, users.userId))
		.leftJoin(departments, eq(proposals.departmentId, departments.departmentId))
		.where(and(...whereConditions))
		.orderBy(desc(projectReports.submittedAt))
		.limit(limit)
		.offset(offset);

	const [totalRow] = await db
		.select({ value: count() })
		.from(projectReports)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.where(and(...whereConditions));
	const total = totalRow?.value ?? 0;

	const items = rows.map((r) => ({
		reportId: r.reportId,
		projectId: r.projectId,
		project: r.projectTitle,
		leader: `${r.leaderFirstName} ${r.leaderLastName}`,
		department: r.departmentName,
		reportType: r.reportType,
		submitted: r.submittedAt.toISOString(),
		storagePath: r.storagePath,
		remarks: r.remarks,
		periodStart: r.periodStart?.toISOString() ?? null,
		periodEnd: r.periodEnd?.toISOString() ?? null,
		archivedAt: r.archivedAt?.toISOString() ?? null,
	}));

	return c.json({ items, total }, 200);
});

// ── GET /reports/stats ──
const statsRoute = createRoute({
	method: "get",
	path: "/reports/stats",
	tags: ["Reports"],
	summary: "Get report counts without fetching full list",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: ReportStatsSchema } },
			description: "Report statistics",
		},
	},
});

app.openapi(statsRoute, async (c) => {
	const user = c.get("user");

	const whereConditions: SQL[] = [isNull(projectReports.archivedAt)];

	if (user.roleName === ROLE_NAMES.FACULTY) {
		if (user.departmentId !== null) {
			whereConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			whereConditions.push(eq(proposals.campusId, user.campusId));
		}
	} else if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			whereConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			whereConditions.push(eq(proposals.campusId, user.campusId));
		}
	}

	const baseJoin = db
		.select({ value: count() })
		.from(projectReports)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.where(and(...whereConditions));

	const [totalRow, progressRow, terminalRow] = await Promise.all([
		baseJoin,
		db
			.select({ value: count() })
			.from(projectReports)
			.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
			.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
			.where(and(...whereConditions, eq(projectReports.reportType, "Progress"))),
		db
			.select({ value: count() })
			.from(projectReports)
			.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
			.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
			.where(and(...whereConditions, eq(projectReports.reportType, "Terminal"))),
	]);

	return c.json(
		{
			total: Number(totalRow[0]?.value ?? 0),
			progress: Number(progressRow[0]?.value ?? 0),
			terminal: Number(terminalRow[0]?.value ?? 0),
		},
		200,
	);
});

// ── POST /reports ──
const createReportRoute = createRoute({
	method: "post",
	path: "/reports",
	tags: ["Reports"],
	summary: "Submit a project report for a project",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: { "application/json": { schema: CreateReportSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: ReportSchema } },
			description: "Report created",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not a project member",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Project not found",
		},
	},
});

app.openapi(createReportRoute, async (c) => {
	const user = c.get("user");
	const body = c.req.valid("json");

	// Verify project exists and resolve its proposal for the membership check.
	const [project] = await db
		.select({
			projectId: projects.projectId,
			proposalId: projects.proposalId,
		})
		.from(projects)
		.where(
			and(eq(projects.projectId, body.projectId), isNull(projects.archivedAt)),
		)
		.limit(1);

	if (!project) {
		throw new ApiError(404, "NOT_FOUND", "Project not found");
	}

	// Only members of the project's proposal (leader or collaborator) may submit
	// reports for it.
	const [membership] = await db
		.select({ memberId: proposalMembers.memberId })
		.from(proposalMembers)
		.where(
			and(
				eq(proposalMembers.proposalId, project.proposalId),
				eq(proposalMembers.userId, user.userId),
			),
		)
		.limit(1);

	if (!membership) {
		throw new ApiError(
			403,
			"NOT_MEMBER",
			"Only project members can submit reports for this project",
		);
	}

	// Sequential submission: verify the next due date in order is the one being submitted
	const [schedule] = await db
		.select({ scheduleId: projectReportingSchedules.scheduleId })
		.from(projectReportingSchedules)
		.where(eq(projectReportingSchedules.projectId, body.projectId))
		.limit(1);

	if (schedule) {
		const allDueDates = await db
			.select()
			.from(projectReportingDates)
			.where(eq(projectReportingDates.scheduleId, schedule.scheduleId))
			.orderBy(projectReportingDates.reportingDate);

		const earliestIncomplete = allDueDates.find((d) => !d.isCompleted);
		if (earliestIncomplete) {
			const previousIncomplete = allDueDates.filter(
				(d) => !d.isCompleted && d.reportingDate < earliestIncomplete.reportingDate,
			);
			if (previousIncomplete.length > 0) {
				throw new ApiError(
					400,
					"SEQUENTIAL_VIOLATION",
					"Previous report must be submitted before the next one",
				);
			}
		}
	}

	const created = await db.transaction(async (tx) => {
		const [report] = await tx
			.insert(projectReports)
			.values({
				projectId: body.projectId,
				submittedById: user.userId,
				reportType: body.reportType,
				remarks: body.remarks ?? null,
				storagePath: null,
				periodStart: body.periodStart ? new Date(body.periodStart) : null,
				periodEnd: body.periodEnd ? new Date(body.periodEnd) : null,
			})
			.returning();

		if (!report) {
			throw new ApiError(500, "INSERT_FAILED", "Failed to create report");
		}

		// Find the reporting schedule for the project
		const [schedule] = await tx
			.select({ scheduleId: projectReportingSchedules.scheduleId })
			.from(projectReportingSchedules)
			.where(eq(projectReportingSchedules.projectId, body.projectId))
			.limit(1);

		if (schedule) {
			// Find the earliest incomplete due date
			const [earliestDueDate] = await tx
				.select()
				.from(projectReportingDates)
				.where(
					and(
						eq(projectReportingDates.scheduleId, schedule.scheduleId),
						eq(projectReportingDates.isCompleted, false),
					),
				)
				.orderBy(projectReportingDates.reportingDate)
				.limit(1);

			if (earliestDueDate) {
				await tx
					.update(projectReportingDates)
					.set({
						isCompleted: true,
						completedAt: new Date(),
					})
					.where(eq(projectReportingDates.id, earliestDueDate.id));
			}
		}

		return report;
	});

	await insertAuditLog({
		userId: user.userId,
		action: `Submitted project report ${created.reportId} (${body.reportType}) for project ${body.projectId}`,
		tableAffected: "project_reports",
		ipAddress: getClientIp(c),
	});

	// DFD 8.2: Clear Overdue flag when report is submitted
	const [projectStatusRow] = await db
		.select({ projectStatus: projects.projectStatus })
		.from(projects)
		.where(eq(projects.projectId, body.projectId))
		.limit(1);

	if (projectStatusRow?.projectStatus === "Overdue") {
		await db
			.update(projects)
			.set({ projectStatus: "Ongoing", updatedAt: new Date() })
			.where(eq(projects.projectId, body.projectId));

		await insertAuditLog({
			userId: user.userId,
			action: `Cleared Overdue flag for project ${body.projectId} after report submission`,
			tableAffected: "projects",
			ipAddress: getClientIp(c),
		});
	}

	// Notify Director(s) about the new report submission
	const directorIds = await getUserIdsByRole("Director");
	const readableType =
		body.reportType === "Progress"
			? "Progress Report"
			: body.reportType === "Terminal"
				? "Terminal Report"
				: "Final Accomplishment Report";

	// Resolve proposal title for the notification
	const [proposalRow] = await db
		.select({ title: proposals.title })
		.from(proposals)
		.where(eq(proposals.proposalId, project.proposalId))
		.limit(1);

	const projectTitle = proposalRow?.title ?? "Unknown Project";

	for (const directorId of directorIds) {
		await createNotification({
			recipientId: directorId,
			type: "report_submitted",
			title: "New Report Submitted",
			message: `A ${readableType} has been submitted for "${projectTitle}".`,
			sendEmail: true,
			emailSubject: `New Report: ${projectTitle}`,
			emailHtml: `<p>A <strong>${readableType}</strong> has been submitted for "<strong>${projectTitle}</strong>".</p>`,
		});
	}

	const [enriched] = await db
		.select({
			reportId: projectReports.reportId,
			projectId: projectReports.projectId,
			projectTitle: proposals.title,
			leaderFirstName: users.firstName,
			leaderLastName: users.lastName,
			departmentName: departments.departmentName,
			reportType: projectReports.reportType,
			submittedAt: projectReports.submittedAt,
			storagePath: projectReports.storagePath,
			remarks: projectReports.remarks,
			periodStart: projectReports.periodStart,
			periodEnd: projectReports.periodEnd,
			archivedAt: projectReports.archivedAt,
		})
		.from(projectReports)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.innerJoin(users, eq(projectReports.submittedById, users.userId))
		.leftJoin(departments, eq(proposals.departmentId, departments.departmentId))
		.where(eq(projectReports.reportId, created.reportId))
		.limit(1);

	if (!enriched) {
		throw new ApiError(
			500,
			"ENRICH_FAILED",
			"Failed to retrieve created report",
		);
	}

	return c.json(
		{
			reportId: enriched.reportId,
			projectId: enriched.projectId,
			project: enriched.projectTitle,
			leader: `${enriched.leaderFirstName} ${enriched.leaderLastName}`,
			department: enriched.departmentName,
			reportType: enriched.reportType,
			submitted: enriched.submittedAt.toISOString(),
			storagePath: enriched.storagePath,
			remarks: enriched.remarks,
			periodStart: enriched.periodStart?.toISOString() ?? null,
			periodEnd: enriched.periodEnd?.toISOString() ?? null,
			archivedAt: enriched.archivedAt?.toISOString() ?? null,
		},
		201,
	);
});

// ── DELETE /reports/:id (soft delete) ──
const archiveRoute = createRoute({
	method: "delete",
	path: "/reports/{id}",
	tags: ["Reports"],
	summary: "Archive a project report (soft delete)",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "Report archived",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not authorized to archive this report",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not found",
		},
	},
});

app.openapi(archiveRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");

	const [report] = await db
		.select({
			reportId: projectReports.reportId,
			submittedById: projectReports.submittedById,
			departmentId: proposals.departmentId,
			campusId: proposals.campusId,
		})
		.from(projectReports)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.where(
			and(eq(projectReports.reportId, id), isNull(projectReports.archivedAt)),
		)
		.limit(1);

	if (!report) {
		throw new ApiError(404, "NOT_FOUND", "Report not found");
	}

	// Authorization: Super Admin / Director may archive anything;
	// RET Chair only within their department/campus scope;
	// everyone else must be the original submitter.
	let allowed =
		user.roleName === ROLE_NAMES.SUPER_ADMIN ||
		user.roleName === ROLE_NAMES.DIRECTOR ||
		report.submittedById === user.userId;

	if (!allowed && user.roleName === ROLE_NAMES.RET_CHAIR) {
		allowed =
			user.isMainCampus && user.departmentId !== null
				? report.departmentId === user.departmentId
				: report.campusId === user.campusId;
	}

	if (!allowed) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You do not have permission to archive this report",
		);
	}

	const [updated] = await db
		.update(projectReports)
		.set({ archivedAt: new Date() })
		.where(
			and(eq(projectReports.reportId, id), isNull(projectReports.archivedAt)),
		)
		.returning();

	if (!updated) {
		throw new ApiError(404, "NOT_FOUND", "Report not found");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Archived project report ${id}`,
		tableAffected: "project_reports",
		ipAddress: getClientIp(c),
	});

	return c.json({ message: "Report archived" }, 200);
});

export default app;
