import { afterEach, describe, expect, it, vi } from "vitest";
import { checkPasswordSafety } from "./functions";

describe("checkPasswordSafety", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("rejects when the breach-check endpoint fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
		);

		await expect(checkPasswordSafety("safe-password")).rejects.toThrow(
			"Unable to verify password safety",
		);
	});
});
