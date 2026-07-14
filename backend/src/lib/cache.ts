import { LRUCache } from "lru-cache";
import { env } from "@/env.js";
import type { AuthUser } from "./types.js";

export const cacheEnabled = env.NODE_ENV !== "test";

// Auth cache keeps hot user profiles in-memory to reduce repeated DB lookups.
export const authUserCache = new LRUCache<string, AuthUser>({
	max: 2000,
	ttl: 1000 * 60 * 5,
	ttlAutopurge: true,
	allowStale: false,
	updateAgeOnGet: false,
	updateAgeOnHas: false,
});

/**
 * Manually invalidate the auth cache for specific user IDs.
 * Use this when a user's role or active status is updated.
 */
export function invalidateAuthUserCache(userIds: string[]): void {
	for (const id of userIds) {
		authUserCache.delete(`auth:user:${id}`);
	}
}

export interface SettingListItem {
	settingKey: string;
	settingValue: string | null;
	updatedAt: string;
}

export interface SettingListCacheValue {
	items: SettingListItem[];
}

// Settings cache is short-lived and cleared on every settings update.
export const settingsListCache = new LRUCache<string, SettingListCacheValue>({
	max: 200,
	ttl: 1000 * 60 * 5,
	ttlAutopurge: true,
	allowStale: false,
	updateAgeOnGet: false,
	updateAgeOnHas: false,
});
