import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";

const BANNER_PROGRAMS_STALE_TIME = 1000 * 60 * 5;

export interface BannerProgram {
	bannerProgramId: number;
	campusId: number;
	departmentId: number | null;
	programName: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

interface ManagedBannerProgramsResponse {
	scopeLabel: string;
	programs: BannerProgram[];
}

async function fetchBannerPrograms(path: string) {
	const token = await getValidAccessToken();
	const response = await fetch(`${API_BASE}${path}`, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		throw new Error(
			await getErrorMessage(response, "Failed to fetch banner programs"),
		);
	}

	return (await response.json()) as BannerProgram[];
}

const getBannerProgramsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await authorizeSessionUser("Faculty", "RET Chair", "Director");
		return fetchBannerPrograms("/banner-programs");
	},
);

const getManagedBannerProgramsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await authorizeSessionUser("RET Chair");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/banner-programs/manage`, {
			headers: { Authorization: `Bearer ${token}` },
		});

		if (!response.ok) {
			throw new Error(
				await getErrorMessage(
					response,
					"Failed to fetch managed banner programs",
				),
			);
		}

		return (await response.json()) as ManagedBannerProgramsResponse;
	},
);

const createBannerProgramSchema = z.object({
	programName: z.string().trim().min(1).max(255),
});

export const createBannerProgramFn = createServerFn({ method: "POST" })
	.validator(createBannerProgramSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("RET Chair");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/banner-programs`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to create banner program"),
			);
		}

		return (await response.json()) as BannerProgram;
	});

const updateBannerProgramSchema = z.object({
	bannerProgramId: z.number().int().positive(),
	programName: z.string().trim().min(1).max(255).optional(),
	isActive: z.boolean().optional(),
});

export const updateBannerProgramFn = createServerFn({ method: "POST" })
	.validator(updateBannerProgramSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("RET Chair");
		const token = await getValidAccessToken();
		const response = await fetch(
			`${API_BASE}/banner-programs/${data.bannerProgramId}`,
			{
				method: "PATCH",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					programName: data.programName,
					isActive: data.isActive,
				}),
			},
		);

		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to update banner program"),
			);
		}

		return (await response.json()) as BannerProgram;
	});

export function bannerProgramsQueryOptions() {
	return queryOptions({
		queryKey: ["banner-programs", "active"],
		queryFn: () => getBannerProgramsFn(),
		staleTime: BANNER_PROGRAMS_STALE_TIME,
	});
}

export function managedBannerProgramsQueryOptions() {
	return queryOptions({
		queryKey: ["banner-programs", "manage"],
		queryFn: () => getManagedBannerProgramsFn(),
		staleTime: BANNER_PROGRAMS_STALE_TIME,
	});
}
