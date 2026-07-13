import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import { getValidAccessToken } from "@/lib/session.server";


export const SearchTypeSchema = z.enum([
	"all",
	"proposals",
	"projects",
	"reports",
	"moas",
	"users",
]);
export type SearchType = z.infer<typeof SearchTypeSchema>;

export const searchParamsSchema = z.object({
	q: z.string().trim().min(1).max(100),
	type: SearchTypeSchema.default("all"),
	limit: z.number().int().min(1).max(20).default(5),
});

export interface SearchResultItem {
	type: "proposals" | "projects" | "reports" | "moas" | "users";
	id: string;
	title: string;
	subtitle: string | null;
}

export interface SearchResponse {
	results: SearchResultItem[];
}

export const globalSearchFn = createServerFn({ method: "GET" })
	.validator(searchParamsSchema)
	.handler(async ({ data }) => {
		const token = await getValidAccessToken();

		const query = new URLSearchParams();
		query.append("q", data.q);
		query.append("type", data.type);
		query.append("limit", data.limit.toString());

		const response = await fetch(`${API_BASE}/search?${query.toString()}`, {
			headers: { Authorization: `Bearer ${token}` },
		});

		if (!response.ok) {
			const message = await getErrorMessage(response, "Search failed");
			throw new Error(message);
		}

		return (await response.json()) as SearchResponse;
	});
