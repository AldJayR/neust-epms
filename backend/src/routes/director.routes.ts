import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { auditLogs } from "../db/schema/audit-logs.js";
import { campuses } from "../db/schema/campuses.js";
import { moas } from "../db/schema/moas.js";
import { projects } from "../db/schema/projects.js";
import { proposals } from "../db/schema/proposals.js";
import { roles } from "../db/schema/roles.js";
import { users } from "../db/schema/users.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { installApiErrorHandler } from "../lib/errors.js";
import { PROPOSAL_STATUS, PROJECT_STATUS, ROLE_NAMES } from "../lib/types.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

const DashboardMetricSchema = z.object({
	totalProjects: z.number(),
	ongoingProjects: z.number(),
	underEvaluation: z.number(),
	completed: z.number(),
});

const ChartPointSchema = z.object({
	label: z.string(),
	value: z.number(),
});

const ActivitySchema = z.object({
	title: z.string(),
	description: z.string(),
	time: z.string(),
});

const MoaSchema = z.object({
	name: z.string(),
	dueText: z.string(),
});

const DirectorDashboardSchema = z.object({
	metrics: DashboardMetricSchema,
	chartData: z.array(ChartPointSchema),
	recentActivities: z.array(ActivitySchema),
	expiringMoas: z.array(MoaSchema),
});

app.use("/*", authMiddleware);
app.use("/*", requireRole(ROLE_NAMES.SUPER_ADMIN, ROLE_NAMES.DIRECTOR));

function formatRelativeTime(date: Date, now: Date) {
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

function activityTitle(action: string, tableAffected: string) {
	const lowerAction = action.toLowerCase();

	if (lowerAction.includes("bulk approved") || lowerAction.includes("approved") || tableAffected === "projects") {
		return "Project Approved";
	}

	if (lowerAction.includes("submitted") || tableAffected === "proposals") {
		return "New Proposal Submitted";
	}

	return "Review Pending";
}

const dashboardRoute = createRoute({
	method: "get",
	path: "/director/dashboard",
	tags: ["Director"],
	summary: "Get director dashboard summary",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: DirectorDashboardSchema } },
			description: "Director dashboard summary",
		},
	},
});

app.openapi(dashboardRoute, async (c) => {
	const now = new Date();
	const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

	const [totalProjectsResult, ongoingProjectsResult, completedProjectsResult, underEvaluationResult] = await Promise.all([
		db.select({ value: count() }).from(projects).where(isNull(projects.archivedAt)),
		db.select({ value: count() }).from(projects).where(and(isNull(projects.archivedAt), eq(projects.projectStatus, PROJECT_STATUS.ONGOING))),
		db.select({ value: count() }).from(projects).where(and(isNull(projects.archivedAt), eq(projects.projectStatus, PROJECT_STATUS.COMPLETED))),
		db.select({ value: count() }).from(proposals).where(
			and(
				isNull(proposals.archivedAt),
				or(
					eq(proposals.currentStatus, PROPOSAL_STATUS.SUBMITTED),
					eq(proposals.currentStatus, PROPOSAL_STATUS.ENDORSED),
				),
			),
		),
	]);

	const chartRows = await db
		.select({
			label: campuses.campusName,
			value: count(),
		})
		.from(proposals)
		.innerJoin(campuses, eq(proposals.campusId, campuses.campusId))
		.where(isNull(proposals.archivedAt))
		.groupBy(campuses.campusName);

	const recentLogRows = await db
		.select({
			action: auditLogs.action,
			tableAffected: auditLogs.tableAffected,
			createdAt: auditLogs.createdAt,
			actorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
		})
		.from(auditLogs)
		.innerJoin(users, eq(auditLogs.userId, users.userId))
		.leftJoin(roles, eq(users.roleId, roles.roleId))
		.orderBy(desc(auditLogs.createdAt))
		.limit(3);

	const expiringMoaRows = await db
		.select({
			partnerName: moas.partnerName,
			validUntil: moas.validUntil,
		})
		.from(moas)
		.where(
			and(
				isNull(moas.archivedAt),
				sql`${moas.validUntil} > ${now}`,
				sql`${moas.validUntil} <= ${twoWeeksFromNow}`,
			),
		)
		.orderBy(moas.validUntil)
		.limit(2);

	return c.json(
		{
			metrics: {
				totalProjects: Number(totalProjectsResult[0]?.value ?? 0),
				ongoingProjects: Number(ongoingProjectsResult[0]?.value ?? 0),
				underEvaluation: Number(underEvaluationResult[0]?.value ?? 0),
				completed: Number(completedProjectsResult[0]?.value ?? 0),
			},
			chartData: chartRows
				.map((row) => ({ label: row.label, value: Number(row.value ?? 0) }))
				.sort((a, b) => b.value - a.value),
			recentActivities: recentLogRows.map((row) => ({
				title: activityTitle(row.action, row.tableAffected),
				description: row.action,
				time: formatRelativeTime(row.createdAt, now),
			})),
			expiringMoas: expiringMoaRows.map((row) => {
				const daysUntilExpiry = Math.max(
					0,
					Math.ceil((row.validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
				);

				return {
					name: row.partnerName,
					dueText:
						daysUntilExpiry === 0
							? "Expires today"
							: `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`,
				};
			}),
		},
		200,
	);
});

export default app;
