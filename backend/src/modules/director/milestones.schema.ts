import { z } from "@hono/zod-openapi";
import { PROJECT_MILESTONE_KINDS } from "@/lib/milestone-types.js";

export const MilestonesQuerySchema = z.object({
	page: z.coerce.number().int().min(1).max(100000).default(1),
	limit: z.coerce.number().int().min(1).max(50).default(5),
});

export const MilestonesResponseSchema = z.object({
	items: z.array(
		z.object({
			id: z.uuid(),
			kind: z.enum(PROJECT_MILESTONE_KINDS),
			proposalId: z.uuid(),
			projectId: z.uuid().nullable(),
			title: z.string(),
			unitLabel: z.string(),
			campus: z.string(),
			actorId: z.uuid().nullable(),
			actorName: z.string().nullable(),
			occurredAt: z.iso.datetime(),
		}),
	),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
});
