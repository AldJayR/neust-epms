import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";
import type { MoaItem } from "@/types/moa";

const STALE_TIME = 1000 * 60 * 5;

const repositoryParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
	status: z.string().optional(),
});

interface MoaRepositoryResponse {
	items: MoaItem[];
	total: number;
	metrics: {
		totalMoas: number;
		expiringWithin90Days: number;
		activePartnerships: number;
	};
}

const getMoaRepositoryFn = createServerFn({ method: "GET" })
	.validator(repositoryParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();
		const query = new URLSearchParams({
			page: String(data.page),
			limit: String(data.limit),
		});
		if (data.search) query.append("search", data.search);
		if (data.status) query.append("status", data.status);
		const response = await fetch(`${API_BASE}/director/moas?${query}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to fetch MOA repository"),
			);
		}
		return (await response.json()) as MoaRepositoryResponse;
	});

export interface ActiveMoa {
	moaId: string;
	partnerName: string;
	validFrom: string;
	validUntil: string;
}

export const getActiveMoasFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await authorizeSessionUser("Director");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/director/moas/active`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			throw new Error(await getErrorMessage(response, "Failed to fetch MOAs"));
		}
		return (await response.json()) as ActiveMoa[];
	},
);

const uploadMoaSchema = z.object({
	partnerName: z.string().min(1, "Partner name is required"),
	validFrom: z.string().min(1, "Signed from date is required"),
	validUntil: z.string().min(1, "Expiration date is required"),
	file: z
		.instanceof(File, { message: "A PDF document is required" })
		.refine(
			(file) => file.type === "application/pdf",
			"Only PDF files are allowed",
		),
});

export const uploadMoaFn = createServerFn({ method: "POST" })
	.validator((data: FormData) => {
		const result = uploadMoaSchema.safeParse({
			partnerName: data.get("partnerName"),
			validFrom: data.get("validFrom"),
			validUntil: data.get("validUntil"),
			file: data.get("file"),
		});
		if (!result.success)
			throw new Error(result.error.issues[0]?.message ?? "Validation failed");
		return data;
	})
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/moas/upload`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}` },
			body: data,
		});
		if (!response.ok) {
			throw new Error(await getErrorMessage(response, "Failed to upload MOA"));
		}
		return response.json();
	});

export function moaRepositoryQueryOptions(
	params: z.infer<typeof repositoryParamsSchema>,
) {
	return queryOptions({
		queryKey: ["dashboard", "moas", params],
		queryFn: () => getMoaRepositoryFn({ data: params }),
		staleTime: STALE_TIME,
		placeholderData: keepPreviousData,
	});
}

export type { MoaItem } from "@/types/moa";
export * from "./details.functions";
