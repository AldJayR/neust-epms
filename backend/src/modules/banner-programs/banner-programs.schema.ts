import { z } from "@hono/zod-openapi";

export const BannerProgramSchema = z
	.object({
		bannerProgramId: z.number().int().positive(),
		campusId: z.number().int().positive(),
		departmentId: z.number().int().positive().nullable(),
		programName: z.string(),
		isActive: z.boolean(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.openapi("BannerProgram");

export const BannerProgramListSchema = z
	.array(BannerProgramSchema)
	.openapi("BannerProgramList");

export const ManagedBannerProgramListSchema = z
	.object({
		scopeLabel: z.string(),
		programs: z.array(BannerProgramSchema),
	})
	.openapi("ManagedBannerProgramList");

export const CreateBannerProgramSchema = z
	.object({
		programName: z.string().trim().min(1).max(255),
	})
	.openapi("CreateBannerProgram");

export const UpdateBannerProgramSchema = z
	.object({
		programName: z.string().trim().min(1).max(255).optional(),
		isActive: z.boolean().optional(),
	})
	.refine(
		(body) => body.programName !== undefined || body.isActive !== undefined,
		{
			message: "At least one banner program field must be provided",
		},
	)
	.openapi("UpdateBannerProgram");

export const BannerProgramParams = z.object({
	id: z.coerce
		.number()
		.int()
		.positive()
		.openapi({
			param: { name: "id", in: "path" },
		}),
});
