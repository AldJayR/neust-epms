import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";
import type { ReportItem, ReportsResponse } from "@/types/report";

const STALE_TIME = 1000 * 60 * 5;

const reportsListParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().trim().min(1).optional(),
});

const getReportsListFn = createServerFn({ method: "GET" })
	.validator(reportsListParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		const token = await getValidAccessToken();
		const searchParams = new URLSearchParams({
			page: String(data.page),
			limit: String(data.limit),
		});
		if (data.search) searchParams.set("search", data.search);
		const response = await fetch(`${API_BASE}/reports?${searchParams}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to fetch reports"),
			);
		}
		return (await response.json()) as ReportsResponse;
	});

const getReportStatsFn = createServerFn({ method: "GET" })
	.validator(z.void())
	.handler(async () => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/reports/stats`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to fetch report stats"),
			);
		}
		return (await response.json()) as {
			total: number;
			progress: number;
			terminal: number;
		};
	});

export const getReportSignedUrlFn = createServerFn({ method: "GET" })
	.validator(z.uuid())
	.handler(async ({ data: reportId }) => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/reports/${reportId}/url`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to open report document"),
			);
		}
		return (await response.json()) as { url: string };
	});

export const emailReportFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			search: z.string().optional(),
			college: z.string().optional(),
			status: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/director/email-report`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(data),
		});
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to send email report"),
			);
		}
		return (await response.json()) as { success: boolean; message: string };
	});

export const submitReportFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			milestoneId: z.uuid(),
			reportType: z.enum(["Progress", "Terminal", "Final Accomplishment"]),
			remarks: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Faculty", "RET Chair", "Director");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/reports`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(data),
		});
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to submit report"),
			);
		}
		return (await response.json()) as ReportItem;
	});

export const uploadReportDocumentFn = createServerFn({ method: "POST" })
	.validator((data: FormData) => {
		const reportId = data.get("reportId");
		const file = data.get("file");
		if (typeof reportId !== "string" || !reportId || !(file instanceof File)) {
			throw new Error("A report ID and PDF file are required");
		}
		if (file.type !== "application/pdf")
			throw new Error("Only PDF documents are allowed");
		return data;
	})
	.handler(async ({ data }) => {
		await authorizeSessionUser("Faculty", "RET Chair", "Director");
		const token = await getValidAccessToken();
		const reportId = data.get("reportId") as string;
		const response = await fetch(`${API_BASE}/reports/${reportId}/document`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}` },
			body: data,
		});
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to upload report document"),
			);
		}
		return (await response.json()) as { reportId: string; storagePath: string };
	});

export function reportsQueryOptions() {
	return queryOptions({
		queryKey: ["dashboard", "reports", "stats"],
		queryFn: () => getReportStatsFn(),
		staleTime: STALE_TIME,
	});
}

export function reportsListQueryOptions(
	params: z.infer<typeof reportsListParamsSchema>,
) {
	return queryOptions({
		queryKey: ["dashboard", "reports", "list", params],
		queryFn: () => getReportsListFn({ data: params }),
		staleTime: STALE_TIME,
		placeholderData: keepPreviousData,
	});
}
export type { ReportItem } from "@/types/report";
