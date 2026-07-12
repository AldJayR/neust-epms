import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import { authorizeSessionUser, getValidAccessToken } from "@/lib/session.server";
import type { FacultyInvolvement } from "@/types/user";

const STALE_TIME = 1000 * 60 * 5;

const directoryParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
	college: z.string().optional(),
	status: z.string().optional(),
});

const getFacultyDirectoryFn = createServerFn({ method: "GET" })
	.validator(directoryParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();
		const query = new URLSearchParams({
			page: String(data.page),
			limit: String(data.limit),
		});
		if (data.search) query.append("search", data.search);
		if (data.college) query.append("college", data.college);
		if (data.status) query.append("status", data.status);
		const response = await fetch(`${API_BASE}/director/faculty?${query}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to fetch faculty directory"),
			);
		}
		return (await response.json()) as {
			items: FacultyInvolvement[];
			total: number;
			metrics: {
				totalActiveExtension: number;
				averageProjectsPerFaculty: number;
				mostActiveCollege: { name: string; contributors: number };
			};
		};
	});

export function facultyDirectoryQueryOptions(
	params: z.infer<typeof directoryParamsSchema>,
) {
	return queryOptions({
		queryKey: ["dashboard", "faculty", params],
		queryFn: () => getFacultyDirectoryFn({ data: params }),
		staleTime: STALE_TIME,
		placeholderData: keepPreviousData,
	});
}

export type { FacultyInvolvement } from "@/types/user";
