import { z } from "@hono/zod-openapi";

export const SettingSchema = z
	.object({
		settingKey: z.string(),
		settingValue: z.string().nullable(),
		updatedAt: z.string(),
	})
	.openapi("SystemSetting");

export const SettingListSchema = z
	.object({ items: z.array(SettingSchema) })
	.openapi("SystemSettingList");

export const UpsertSettingSchema = z
	.object({
		settingKey: z.string().min(1),
		settingValue: z.string(),
	})
	.openapi("UpsertSetting");

export const PaginationQuery = z.object({
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
