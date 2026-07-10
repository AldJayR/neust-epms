import { afterEach, describe, expect, it, vi } from "vitest";
import { isPasswordCompromised } from "./password-check.js";

describe("isPasswordCompromised", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("rejects when HIBP is unavailable", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

		await expect(isPasswordCompromised("safe-password")).rejects.toThrow(
			"Password safety check is unavailable",
		);
	});
});
