import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";

export const reviewProposalFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			proposalId: z.uuid(),
			decision: z.enum(["Endorsed", "Approved", "Returned", "Rejected"]),
			comments: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();
		const response = await fetch(
			`${API_BASE}/proposals/${data.proposalId}/review`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					decision: data.decision,
					comments: data.comments,
				}),
			},
		);
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to submit review"),
			);
		}
		return (await response.json()) as { message: string };
	});

export const downloadAnnotatedProposalFn = createServerFn({ method: "GET" })
	.validator(
		z.object({
			proposalId: z.uuid(),
			documentId: z.uuid(),
		}),
	)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		const token = await getValidAccessToken();
		const response = await fetch(
			`${API_BASE}/proposals/${data.proposalId}/documents/${data.documentId}/annotated`,
			{
				headers: { Authorization: `Bearer ${token}` },
			},
		);

		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to generate annotated PDF"),
			);
		}

		const contentDisposition = response.headers.get("content-disposition");
		const fileName =
			contentDisposition?.match(/filename="([^"]+)"/)?.[1] ??
			`proposal-${data.proposalId}-annotated.pdf`;

	return {
			base64: bytesToBase64(new Uint8Array(await response.arrayBuffer())),
			fileName,
		};
	});

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	const chunkSize = 0x8000;
	for (let index = 0; index < bytes.length; index += chunkSize) {
		binary += String.fromCharCode(
			...bytes.subarray(index, Math.min(index + chunkSize, bytes.length)),
		);
	}
	return btoa(binary);
}
