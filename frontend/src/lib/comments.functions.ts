import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import { authorizeSessionUser, getValidAccessToken } from "./session.server";


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
	proposalId: z.uuid(),
	documentId: z.uuid(),
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
	proposalId: z.uuid(),
	documentId: z.uuid(),
});

export const saveProposalCommentFn = createServerFn({ method: "POST" })
	.validator(saveCommentValidator)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();

		const { proposalId, documentId, content, annotationJson } = data;

		const response = await fetch(
			`${API_BASE}/proposals/${proposalId}/documents/${documentId}/comments`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					content,
					annotationJson,
				}),
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(response, "Failed to save comment");
			throw new Error(message);
		}

		return (await response.json()) as ProposalComment;
	});

export const getProposalCommentsFn = createServerFn({ method: "GET" })
	.validator(getCommentsValidator)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		const token = await getValidAccessToken();

		const { proposalId, documentId } = data;

		const response = await fetch(
			`${API_BASE}/proposals/${proposalId}/documents/${documentId}/comments`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch comments",
			);
			throw new Error(message);
		}

		return (await response.json()) as ProposalComment[];
	});
