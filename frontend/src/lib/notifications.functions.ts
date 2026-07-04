import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authorizeSessionUser, getValidAccessToken } from "./session.server";

const API_BASE = process.env.API_URL ?? "http://localhost:3001/api/v1";

export interface Notification {
	notificationId: string;
	recipientId: string;
	type: string;
	title: string;
	message: string;
	isRead: boolean;
	createdAt: string;
	readAt: string | null;
}

// ── Query options (used by useQuery in components) ──

export const getNotificationsQueryOptions = queryOptions({
	queryKey: ["notifications"],
	queryFn: async () => {
		const accessToken = await getValidAccessToken();
		const res = await fetch(`${API_BASE}/notifications`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok) return [] as Notification[];
		return (await res.json()) as Notification[];
	},
	refetchInterval: 30_000,
});

export const getUnreadCountQueryOptions = queryOptions({
	queryKey: ["notifications", "unread-count"],
	queryFn: async () => {
		const accessToken = await getValidAccessToken();
		const res = await fetch(`${API_BASE}/notifications/unread-count`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok) return { count: 0 };
		return (await res.json()) as { count: number };
	},
	refetchInterval: 30_000,
});

// ── Server functions (for mutations) ──

export const markNotificationReadFn = createServerFn({ method: "POST" })
	.validator(z.object({ notificationId: z.string().uuid() }))
	.handler(async ({ data }) => {
		await authorizeSessionUser(
			"Faculty",
			"RET Chair",
			"Director",
			"Super Admin",
		);
		const accessToken = await getValidAccessToken();

		const res = await fetch(
			`${API_BASE}/notifications/${data.notificationId}/read`,
			{
				method: "PATCH",
				headers: { Authorization: `Bearer ${accessToken}` },
			},
		);

		if (!res.ok) {
			throw new Error("Failed to mark notification as read");
		}

		return { ok: true as const };
	});
