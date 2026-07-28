import { describe, expect, it } from "vitest";
import { sanitizeAuditValue } from "./audit-value.js";

describe("sanitizeAuditValue", () => {
	it("redacts sensitive nested fields while preserving safe values", () => {
		const result = sanitizeAuditValue({
			password: "secret",
			profile: {
				email: "person@example.com",
				name: "Person",
			},
			items: [{ token: "abc", count: 2 }],
			createdAt: new Date("2026-01-02T03:04:05.000Z"),
		});

		expect(result).toEqual({
			password: "[REDACTED]",
			profile: {
				email: "[REDACTED]",
				name: "Person",
			},
			items: [{ token: "[REDACTED]", count: 2 }],
			createdAt: "2026-01-02T03:04:05.000Z",
		});
	});

	it("preserves null and undefined values", () => {
		expect(sanitizeAuditValue(null)).toBeNull();
		expect(sanitizeAuditValue(undefined)).toBeUndefined();
	});
});
