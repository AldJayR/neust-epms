import type { ApiErrorResponse } from "@/lib/auth";

export async function getErrorMessage(
	response: Response,
	defaultMessage: string,
): Promise<string> {
	try {
		const contentType = response.headers.get("content-type");
		if (contentType?.includes("application/json")) {
			const body = (await response.json()) as ApiErrorResponse;
			return body.error?.message ?? defaultMessage;
		}
		const text = await response.text();
		if (text && text.length < 200) return text;
	} catch {
		// A malformed response must not hide the caller's fallback message.
	}
	return defaultMessage;
}
