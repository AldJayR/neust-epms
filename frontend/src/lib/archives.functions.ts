import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getErrorMessage } from "./auth.functions";
import { authorizeSessionUser, getValidAccessToken } from "./session.server";

export const API_BASE = process.env.API_URL ?? "http://localhost:3001/api/v1";
const ARCHIVE_QUERY_STALE_TIME_MS = 1000 * 60; // 1 minute stale time for archives

const archiveParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
});

export interface ArchivedProposal {
	proposalId: string;
	title: string;
	extensionCategory: string;
	archivedAt: string | null;
}

export interface ArchivedProject {
	projectId: string;
	title: string;
	projectStatus: string;
	archivedAt: string | null;
}

export interface ArchivedMoa {
	moaId: string;
	partnerId: string | null;
	validFrom: string;
	validUntil: string;
	archivedAt: string | null;
}

export const getArchivedProposalsFn = createServerFn({ method: "GET" })
	.validator(archiveParamsSchema)
	.handler(async ({ data: { page, limit } }) => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		const token = await getValidAccessToken();

		const response = await fetch(
			`${API_BASE}/proposals?archived=true&page=${page}&limit=${limit}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch archived proposals",
			);
			throw new Error(message);
		}

		return (await response.json()) as {
			items: ArchivedProposal[];
			total: number;
		};
	});

export const getArchivedProjectsFn = createServerFn({ method: "GET" })
	.validator(archiveParamsSchema)
	.handler(async ({ data: { page, limit } }) => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		const token = await getValidAccessToken();

		const response = await fetch(
			`${API_BASE}/projects?archived=true&page=${page}&limit=${limit}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch archived projects",
			);
			throw new Error(message);
		}

		return (await response.json()) as {
			items: ArchivedProject[];
			total: number;
		};
	});

export const getArchivedMoasFn = createServerFn({ method: "GET" })
	.validator(archiveParamsSchema)
	.handler(async ({ data: { page, limit } }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();

		const response = await fetch(
			`${API_BASE}/moas?archived=true&page=${page}&limit=${limit}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch archived MOAs",
			);
			throw new Error(message);
		}

		return (await response.json()) as { items: ArchivedMoa[]; total: number };
	});

export function archivedProposalsQueryOptions(params: {
	page: number;
	limit: number;
}) {
	return queryOptions({
		queryKey: ["archives", "proposals", params],
		queryFn: () => getArchivedProposalsFn({ data: params }),
		staleTime: ARCHIVE_QUERY_STALE_TIME_MS,
		placeholderData: keepPreviousData,
	});
}

export function archivedProjectsQueryOptions(params: {
	page: number;
	limit: number;
}) {
	return queryOptions({
		queryKey: ["archives", "projects", params],
		queryFn: () => getArchivedProjectsFn({ data: params }),
		staleTime: ARCHIVE_QUERY_STALE_TIME_MS,
		placeholderData: keepPreviousData,
	});
}

export function archivedMoasQueryOptions(params: {
	page: number;
	limit: number;
}) {
	return queryOptions({
		queryKey: ["archives", "moas", params],
		queryFn: () => getArchivedMoasFn({ data: params }),
		staleTime: ARCHIVE_QUERY_STALE_TIME_MS,
		placeholderData: keepPreviousData,
	});
}

export const restoreProposalFn = createServerFn({ method: "POST" })
	.validator(z.string())
	.handler(async ({ data: id }) => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/proposals/${id}/restore`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to restore proposal",
			);
			throw new Error(message);
		}

		return (await response.json()) as { message: string; id: string };
	});

export const restoreProjectFn = createServerFn({ method: "POST" })
	.validator(z.string())
	.handler(async ({ data: id }) => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/projects/${id}/restore`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to restore project",
			);
			throw new Error(message);
		}

		return (await response.json()) as { message: string; id: string };
	});

export const restoreMoaFn = createServerFn({ method: "POST" })
	.validator(z.string())
	.handler(async ({ data: id }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/moas/${id}/restore`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(response, "Failed to restore MOA");
			throw new Error(message);
		}

		return (await response.json()) as { message: string; id: string };
	});
