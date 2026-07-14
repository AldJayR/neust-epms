import { z } from "zod";

export const passwordResetSearchSchema = z.object({
	email: z.email().optional(),
});
