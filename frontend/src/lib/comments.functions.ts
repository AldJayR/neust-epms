import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ApiErrorResponse } from "./auth";
import { useAppSession } from "./session.server";

const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";

export interface AnnotationData {
	x: number;
	y: number;
	width: number;
	height: number;
	page: number;
}

export interface ProposalComment {
	commentId: string;
	proposalId: string;
	documentId: string;
	userId: string;
	content: string;
	annotationJson: AnnotationData | null;
	createdAt: string;
	user: {
		userId: string;
		name: string;
		email: string;
		roleName: string;
	};
}

const saveCommentValidator = z.object({
	proposalId: z.string().uuid(),
	documentId: z.string().uuid(),
	content: z.string().min(1),
	annotationJson: z
		.object({
			x: z.number(),
			y: z.number(),
			width: z.number(),
			height: z.number(),
			page: z.number(),
		})
		.nullable()
		.optional(),
});

const getCommentsValidator = z.object({
	proposalId: z.string().uuid(),
	documentId: z.string().uuid(),
});

export const saveProposalCommentFn = createServerFn({ method: "POST" })
	.validator(saveCommentValidator)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const { accessToken } = session.data;
		if (!accessToken) throw new Error("Unauthorized");

		const { proposalId, documentId, content, annotationJson } = data;

		const response = await fetch(
			`${API_BASE}/proposals/${proposalId}/documents/${documentId}/comments`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({
					content,
					annotationJson,
				}),
			},
		);

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to save comment");
		}

		return (await response.json()) as ProposalComment;
	});

export const getProposalCommentsFn = createServerFn({ method: "GET" })
	.validator(getCommentsValidator)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const { accessToken } = session.data;
		if (!accessToken) throw new Error("Unauthorized");

		const { proposalId, documentId } = data;

		const response = await fetch(
			`${API_BASE}/proposals/${proposalId}/documents/${documentId}/comments`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to fetch comments");
		}

		return (await response.json()) as ProposalComment[];
	});
