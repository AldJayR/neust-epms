import { describe, expect, it } from "vitest";
import { clearCspNonce, getCspNonce } from "./csp-nonce.server";

describe("request-scoped CSP nonces", () => {
	it("isolates requests to the same URL without Cloudflare headers", () => {
		const first = new Request("https://example.com/projects");
		const second = new Request("https://example.com/projects");
		const firstNonce = getCspNonce(first);
		const secondNonce = getCspNonce(second);
		expect(firstNonce).not.toBe(secondNonce);
		expect(getCspNonce(first)).toBe(firstNonce);
		clearCspNonce(first);
		expect(getCspNonce(second)).toBe(secondNonce);
	});
});
