import { ApiError } from "@/lib/errors.js";

export function buildTsQuery(raw: string): string {
	const tokens = raw
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.map((token) => token.trim())
		.filter(Boolean)
		.slice(0, 10);

	if (tokens.length === 0) {
		throw new ApiError(
			400,
			"BAD_REQUEST",
			"Search term contains no searchable tokens",
		);
	}

	return tokens.map((token) => `${token}:*`).join(" & ");
}
