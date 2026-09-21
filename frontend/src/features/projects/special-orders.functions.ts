import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";

export const getSpecialOrderSignedUrlFn = createServerFn({ method: "GET" })
	.validator(z.string())
	.handler(async ({ data: specialOrderId }) => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		const token = await getValidAccessToken();
		const response = await fetch(
			`${API_BASE}/special-orders/${specialOrderId}/url`,
			{ headers: { Authorization: `Bearer ${token}` } },
		);
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to get signed URL"),
			);
		}
		return (await response.json()) as { url: string };
	});

export const getAccessTokenForUploadFn = createServerFn({ method: "GET" })
	.validator(z.void())
	.handler(async () => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		return getValidAccessToken();
	});

const uploadSchema = z.object({
	memberId: z.uuid("Invalid member ID"),
	soNumber: z.string().optional(),
	file: z
		.instanceof(File, { message: "A PDF file is required" })
		.refine(
			(file) =>
				file.type === "application/pdf" ||
				file.name.toLowerCase().endsWith(".pdf"),
			"Only PDF files are allowed",
		),
});

export const uploadSpecialOrderFn = createServerFn({ method: "POST" })
	.validator((data: FormData) => {
		const memberId = data.get("memberId");
		const rawSoNumber = data.get("soNumber");
		const soNumber =
			typeof rawSoNumber === "string" && rawSoNumber.trim()
				? rawSoNumber.trim()
				: typeof memberId === "string"
					? `SO-PENDING-${memberId.slice(0, 8).toUpperCase()}`
					: "SO-PENDING";
		data.set("soNumber", soNumber);

		const result = uploadSchema.safeParse({
			memberId,
			soNumber,
			file: data.get("file"),
		});
		if (!result.success)
			throw new Error(result.error.issues[0]?.message ?? "Validation failed");
		return data;
	})
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/special-orders/upload`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}` },
			body: data,
		});
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to upload special order"),
			);
		}
		return response.json();
	});
