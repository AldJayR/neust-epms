import { z } from "zod";
import { dashboardYearSchema } from "./dashboard-year";

/** Only known dashboard state is carried between screens; never accept a return URL. */
export const directorDashboardStateSchema = z.object({
	year: dashboardYearSchema.optional(),
	campusId: z.number().int().positive().optional().catch(undefined),
	departmentId: z.number().int().nonnegative().optional().catch(undefined),
	decisionQueue: z
		.enum(["review", "signing", "activation", "completion"])
		.optional()
		.catch(undefined),
	decisionPage: z.number().int().min(1).max(100000).optional().catch(undefined),
	decisionExpanded: z.boolean().optional().catch(undefined),
	reportPage: z.number().int().min(1).max(100000).optional().catch(undefined),
	reportExpanded: z.boolean().optional().catch(undefined),
	departmentSort: z
		.enum(["name", "active", "completed", "total"])
		.optional()
		.catch(undefined),
});

export type DirectorDashboardState = z.infer<
	typeof directorDashboardStateSchema
>;
export const dashboardReturnSchema = directorDashboardStateSchema
	.optional()
	.catch(undefined);
