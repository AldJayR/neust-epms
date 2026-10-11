import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";
import {
	MAX_SECTOR_LABEL_LENGTH,
	sectorLabelLength,
	sectorSearchResponseSchema,
} from "./schema";

export const SECTOR_SEARCH_QUERY_KEY = [
	"beneficiary-sectors",
	"search",
] as const;

const searchSectorsFn = createServerFn({ method: "GET" })
	.validator(
		z.object({
			q: z
				.string()
				.refine((query) => sectorLabelLength(query) <= MAX_SECTOR_LABEL_LENGTH),
		}),
	)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Faculty", "RET Chair", "Director");
		const accessToken = await getValidAccessToken();
		const url = new URL(`${API_BASE}/beneficiary-sectors/search`);
		url.searchParams.set("q", data.q);
		const response = await fetch(url, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!response.ok)
			throw new Error(
				await getErrorMessage(response, "Sector suggestions are unavailable."),
			);
		return sectorSearchResponseSchema.parse(await response.json());
	});

export function sectorSearchQueryOptions(query: string) {
	return queryOptions({
		queryKey: [...SECTOR_SEARCH_QUERY_KEY, query],
		queryFn: () => searchSectorsFn({ data: { q: query } }),
		staleTime: 60_000,
		retry: false,
	});
}
