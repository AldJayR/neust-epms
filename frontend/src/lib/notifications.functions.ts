import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { authorizeSessionUser, getValidAccessToken } from "./session.server";


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

// ── Server functions (for queries and mutations) ──

export const getNotificationsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await authorizeSessionUser(
			"Faculty",
			"RET Chair",
			"Director",
			"Super Admin",
		);
		const accessToken = await getValidAccessToken();
		const res = await fetch(`${API_BASE}/notifications`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok) return [] as Notification[];
		return (await res.json()) as Notification[];
	},
);

export const getUnreadCountFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await authorizeSessionUser(
			"Faculty",
			"RET Chair",
			"Director",
			"Super Admin",
		);
		const accessToken = await getValidAccessToken();
		const res = await fetch(`${API_BASE}/notifications/unread-count`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok) return { count: 0 };
		return (await res.json()) as { count: number };
	},
);

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

export const markAllNotificationsReadFn = createServerFn({ method: "POST" })
	.validator(z.void())
	.handler(async () => {
		await authorizeSessionUser(
			"Faculty",
			"RET Chair",
			"Director",
			"Super Admin",
		);
		const accessToken = await getValidAccessToken();

		const res = await fetch(`${API_BASE}/notifications/read-all`, {
			method: "PATCH",
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		if (!res.ok) {
			throw new Error("Failed to mark all notifications as read");
		}

		return { ok: true as const };
	});

// ── Query options (used by useQuery in components) ──

export const getNotificationsQueryOptions = queryOptions({
	queryKey: ["notifications"],
	queryFn: () => getNotificationsFn(),
	refetchInterval: 30_000,
});

export const getUnreadCountQueryOptions = queryOptions({
	queryKey: ["notifications", "unread-count"],
	queryFn: () => getUnreadCountFn(),
	refetchInterval: 30_000,
});
