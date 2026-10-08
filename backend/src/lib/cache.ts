import { LRUCache } from "lru-cache";
import { env } from "@/env.js";

export const cacheEnabled = env.NODE_ENV !== "test";

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
