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
