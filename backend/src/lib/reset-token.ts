import { createHash, randomBytes } from "node:crypto";

export const RESET_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Generate a cryptographically random, URL-safe reset token
 * and its SHA-256 hash for storage. Only the hash is persisted.
 */
export function createResetToken(): {
	token: string;
	tokenHash: string;
} {
	const token = randomBytes(32).toString("base64url");
	return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}