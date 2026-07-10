import type { z } from "@hono/zod-openapi";
import { db } from "@/db/client.js";
import { systemSettings } from "@/db/schema/system-settings.js";
import { insertAuditLog } from "@/lib/audit.js";
import {
	cacheEnabled,
	type SettingListCacheValue,
	settingsListCache,
} from "@/lib/cache.js";
import { ApiError } from "@/lib/errors.js";
import type { AuthUser } from "@/lib/types.js";
import { ROLE_NAMES } from "@/lib/types.js";
import type { SettingSchema, UpsertSettingSchema } from "./settings.schema.js";

type Setting = z.infer<typeof SettingSchema>;

export async function listSettings(query: {
	page: number;
	limit: number;
}): Promise<{ items: Setting[] }> {
	const { page, limit } = query;
	const offset = (page - 1) * limit;
	const cacheKey = `settings:list:${page}:${limit}`;

	if (cacheEnabled) {
		const cached = settingsListCache.get(cacheKey);
		if (cached) {
			return cached;
		}
	}

	const rows = await db
		.select({
			settingKey: systemSettings.settingKey,
			settingValue: systemSettings.settingValue,
			updatedAt: systemSettings.updatedAt,
		})
		.from(systemSettings)
		.orderBy(systemSettings.settingKey)
		.limit(limit)
		.offset(offset);
	const items = rows.map((r) => ({
		...r,
		updatedAt: r.updatedAt.toISOString(),
	}));
	const payload: SettingListCacheValue = { items };

	if (cacheEnabled) {
		settingsListCache.set(cacheKey, payload);
	}

	return payload;
}

export async function upsertSetting(
	user: AuthUser,
	body: z.infer<typeof UpsertSettingSchema>,
	ipAddress: string,
): Promise<Setting> {
	if (user.roleName !== ROLE_NAMES.SUPER_ADMIN) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"Only Super Admin can modify settings",
		);
	}

	const [result] = await db
		.insert(systemSettings)
		.values({
			settingKey: body.settingKey,
			settingValue: body.settingValue,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: systemSettings.settingKey,
			set: {
				settingValue: body.settingValue,
				updatedAt: new Date(),
			},
		})
		.returning();

	if (!result) {
		throw new ApiError(500, "UPSERT_FAILED", "Failed to upsert setting");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Upserted setting "${body.settingKey}"`,
		tableAffected: "system_settings",
		ipAddress,
	});

	if (cacheEnabled) {
		settingsListCache.clear();
	}

	return { ...result, updatedAt: result.updatedAt.toISOString() };
}
