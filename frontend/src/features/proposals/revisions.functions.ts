import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";

export interface RevisionResponse {
	responseId: string;
	responseType: "Changed" | "Clarification";
	explanation: string;
	revisedPage: number | null;
	documentId: string | null;
	version: number | null;
	respondedBy: string;
	updatedAt: string;
	submittedAt: string | null;
	verifications: {
		decision: string;
		explanation: string | null;
		verifiedBy: string;
		verifiedAt: string;
	}[];
}
export interface RevisionRequest {
	requestId: string;
	content: string;
	reviewStage: string;
	status: string;
	createdBy: string;
	createdAt: string;
	commentId: string | null;
	documentId: string | null;
	version: number | null;
	originalPage: number | null;
	canRespond: boolean;
	canVerify: boolean;
	canReopen: boolean;
	reopenings: {
		reopeningId: string;
		documentId: string;
		version: number;
		explanation: string;
		reopenedBy: string;
		reopenedAt: string;
	}[];
	draft: RevisionResponse | null;
	responses: RevisionResponse[];
}
export interface RevisionReadiness {
	status: string;
	canRespond: boolean;
	canReview: boolean;
	stage: string | null;
	outstanding: number;
	answered: number;
	stageOutstanding: number;
	revisedDocumentReady: boolean;
	latestDocumentId: string | null;
	canResubmit: boolean;
}

async function revisionApi<T>(
	path: string,
	method = "GET",
	body?: unknown,
): Promise<T> {
	await authorizeSessionUser("Director", "RET Chair", "Faculty");
	const token = await getValidAccessToken();
	const response = await fetch(`${API_BASE}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	if (!response.ok)
		throw new Error(
			await getErrorMessage(response, "Unable to update revision feedback"),
		);
	return (await response.json()) as T;
}

const proposalInput = z.object({ proposalId: z.uuid() });
const requestInput = proposalInput.extend({ requestId: z.uuid() });

export const getRevisionRequestsFn = createServerFn({ method: "GET" })
	.validator(
		proposalInput.extend({
			page: z.number().int().min(1).default(1),
			status: z.string().optional(),
			stage: z.string().optional(),
		}),
	)
	.handler(({ data }) => {
		const query = new URLSearchParams({ page: String(data.page), limit: "20" });
		if (data.status) query.set("status", data.status);
		if (data.stage) query.set("stage", data.stage);
		return revisionApi<{
			items: RevisionRequest[];
			total: number;
			page: number;
			limit: number;
		}>(`/proposals/${data.proposalId}/revision-requests?${query}`);
	});
export const getRevisionReadinessFn = createServerFn({ method: "GET" })
	.validator(proposalInput)
	.handler(({ data }) =>
		revisionApi<RevisionReadiness>(
			`/proposals/${data.proposalId}/revision-readiness`,
		),
	);
export const saveRevisionResponseFn = createServerFn({ method: "POST" })
	.validator(
		requestInput.extend({
			responseType: z.enum(["Changed", "Clarification"]),
			explanation: z.string().trim().min(1).max(10000),
			revisedPage: z.number().int().positive().nullable(),
		}),
	)
	.handler(({ data: { proposalId, requestId, ...body } }) =>
		revisionApi<{ message: string }>(
			`/proposals/${proposalId}/revision-requests/${requestId}/response`,
			"PUT",
			body,
		),
	);
export const verifyRevisionFn = createServerFn({ method: "POST" })
	.validator(
		requestInput.extend({
			responseId: z.uuid(),
			decision: z.enum(["Resolved", "Further revision needed"]),
			explanation: z.string().max(10000).optional(),
		}),
	)
	.handler(({ data: { proposalId, requestId, ...body } }) =>
		revisionApi<{ message: string }>(
			`/proposals/${proposalId}/revision-requests/${requestId}/verify`,
			"POST",
			body,
		),
	);
export const createRevisionRequestFn = createServerFn({ method: "POST" })
	.validator(
		proposalInput.extend({
			commentId: z.uuid().optional(),
			content: z.string().trim().min(1).max(10000).optional(),
		}),
	)
	.handler(({ data: { proposalId, ...body } }) =>
		revisionApi<{ message: string }>(
			`/proposals/${proposalId}/revision-requests`,
			"POST",
			body,
		),
	);
export const reopenRevisionFn = createServerFn({ method: "POST" })
	.validator(
		requestInput.extend({ explanation: z.string().trim().min(1).max(10000) }),
	)
	.handler(({ data: { proposalId, requestId, ...body } }) =>
		revisionApi<{ message: string }>(
			`/proposals/${proposalId}/revision-requests/${requestId}/reopen`,
			"POST",
			body,
		),
	);
export const getRevisionDocumentUrlFn = createServerFn({ method: "GET" })
	.validator(proposalInput.extend({ documentId: z.uuid() }))
	.handler(({ data }) =>
		revisionApi<{ url: string }>(
			`/proposals/${data.proposalId}/documents/${data.documentId}/url`,
		),
	);

export const revisionReadinessQueryOptions = (proposalId: string) =>
	queryOptions({
		queryKey: ["proposal-revisions", proposalId, "readiness"],
		queryFn: () => getRevisionReadinessFn({ data: { proposalId } }),
	});
