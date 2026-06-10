import { createHash } from "node:crypto";

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

	const response = await fetch(
		`https://api.pwnedpasswords.com/range/${prefix}`,
		{
			headers: { AddPadding: "no" },
			signal: AbortSignal.timeout(3000),
		},
	);

	if (!response.ok) {
		// HIBP API unreachable — fail open (don't block registration)
		return false;
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
