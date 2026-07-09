import { createRoute, z } from "@hono/zod-openapi";

export const ActionItemSchema = z
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

export const ActionCenterResponseSchema = z
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

export const getActionCenterRoute = createRoute({
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
