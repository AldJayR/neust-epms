import { createHash } from "node:crypto";
import { ApiError } from "./errors.js";

/**
 * Check if a password has been exposed in known data breaches
 * using the Have I Been Pwned (HIBP) k-anonymity API.
 *
 * Only the first 5 characters of the SHA-1 hash are sent —
 * the password never leaves the server in plaintext.
 */
export async function isPasswordCompromised(
	password: string,
): Promise<boolean> {
	const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
	const prefix = hash.slice(0, 5);
	const suffix = hash.slice(5);

	let response: Response;
	try {
		response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
			headers: { AddPadding: "no" },
			signal: AbortSignal.timeout(3000),
		});
	} catch {
		throw new ApiError(
			503,
			"PASSWORD_CHECK_UNAVAILABLE",
			"Password safety check is unavailable",
		);
	}

	if (!response.ok) {
		throw new ApiError(
			503,
			"PASSWORD_CHECK_UNAVAILABLE",
			"Password safety check is unavailable",
		);
	}

	const text = await response.text();

	for (const line of text.split("\n")) {
		const [hashSuffix, count] = line.split(":");
		if (hashSuffix === suffix && Number(count) > 0) {
			return true;
		}
	}

	return false;
}
