import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getErrorMessage } from "./auth.functions";
import { authorizeSessionUser, getValidAccessToken } from "./session.server";

const API_BASE = process.env.API_URL ?? "http://localhost:3001/api/v1";

// ── Schema ──────────────────────────────────────────────────
const upsertSettingSchema = z.object({
	settingKey: z.string().min(1),
	settingValue: z.string(),
});

interface SettingsResponse {
	items: {
		settingKey: string;
		settingValue: string | null;
		updatedAt: string;
	}[];
}

// ── Get Settings ────────────────────────────────────────────

export const getSettingsFn = createServerFn({ method: "GET" })
	.validator(z.void())
	.handler(async () => {
		await authorizeSessionUser("Super Admin");
		const token = await getValidAccessToken();

		const response = await fetch(
			`${API_BASE}/settings?page=1&limit=100`,
			{ headers: { Authorization: `Bearer ${token}` } },
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch settings",
			);
			throw new Error(message);
		}

		const data = (await response.json()) as SettingsResponse;
		const map: Record<string, string> = {};
		for (const item of data.items) {
			if (item.settingValue != null) map[item.settingKey] = item.settingValue;
		}
		return map;
	});

// ── Update Setting ──────────────────────────────────────────

export const updateSettingFn = createServerFn({ method: "POST" })
	.validator(upsertSettingSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Super Admin");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/settings`, {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to update setting",
			);
			throw new Error(message);
		}

		return response.json();
	});

// ── Query Options ───────────────────────────────────────────

export function settingsQueryOptions() {
	return queryOptions({
		queryKey: ["settings"],
		queryFn: () => getSettingsFn(),
		staleTime: 1000 * 60 * 5, // 5 min
	});
}
