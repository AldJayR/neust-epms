import { describe, expect, it } from "vitest";
import { hashFileSha256 } from "./file-integrity.service.js";

describe("hashFileSha256", () => {
	it("returns the deterministic SHA-256 digest of file bytes", async () => {
		const result = await hashFileSha256(new File(["hello"], "hello.txt"));

		expect(result).toBe(
			"2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
		);
	});
});
