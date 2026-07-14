import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";

const STALE_TIME = 1000 * 60 * 5;

// ── Schemas ─────────────────────────────────────────────────

const updateMoaSchema = z.object({
	moaId: z.uuid(),
	validFrom: z.iso.datetime().optional(),
	validUntil: z.iso.datetime().optional(),
	partnerId: z.uuid().optional(),
});

// ── Interfaces ──────────────────────────────────────────────

export interface MoaDetails {
	moaId: string;
	partnerId: string;
	partnerName: string;
	storagePath: string | null;
	validFrom: string;
	validUntil: string;
	createdAt: string;
	updatedAt: string;
	archivedAt: string | null;
	status: "Valid" | "Renewal Needed" | "Expired";
	daysToExpiry: number | "Expired";
}

export interface MoaLinkedProject {
	projectId: string;
	title: string;
	projectStatus: string;
	leaderName: string | null;
	createdAt: string;
}

// ── Server Functions ────────────────────────────────────────

export const getMoaDetailsFn = createServerFn({ method: "GET" })
	.validator(z.object({ moaId: z.uuid() }))
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/moas/${data.moaId}`, {
			headers: { Authorization: `Bearer ${token}` },
		});

		if (!response.ok) {
			const message = await getErrorMessage(response, "Failed to fetch MOA");
			throw new Error(message);
		}

		return (await response.json()) as MoaDetails;
	});

export const getMoaLinkedProjectsFn = createServerFn({ method: "GET" })
	.validator(z.object({ moaId: z.uuid() }))
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/moas/${data.moaId}/projects`, {
			headers: { Authorization: `Bearer ${token}` },
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch linked projects",
			);
			throw new Error(message);
		}

		return (await response.json()) as MoaLinkedProject[];
	});

export const updateMoaFn = createServerFn({ method: "POST" })
	.validator(updateMoaSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director");
		const token = await getValidAccessToken();

		const { moaId, ...body } = data;

		const response = await fetch(`${API_BASE}/moas/${moaId}`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const message = await getErrorMessage(response, "Failed to update MOA");
			throw new Error(message);
		}

		return (await response.json()) as MoaDetails;
	});

// ── Query Options ───────────────────────────────────────────

export function moaDetailsQueryOptions(moaId: string) {
	return queryOptions({
		queryKey: ["moas", moaId],
		queryFn: () => getMoaDetailsFn({ data: { moaId } }),
		staleTime: STALE_TIME,
	});
}

export function moaLinkedProjectsQueryOptions(moaId: string) {
	return queryOptions({
		queryKey: ["moas", moaId, "projects"],
		queryFn: () => getMoaLinkedProjectsFn({ data: { moaId } }),
		staleTime: STALE_TIME,
	});
}
