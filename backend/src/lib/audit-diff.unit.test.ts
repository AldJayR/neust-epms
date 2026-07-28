import { describe, expect, it } from "vitest";
import { captureAuditDiff } from "./audit-diff.js";

describe("captureAuditDiff", () => {
	it("returns only changed requested fields", () => {
		expect(
			captureAuditDiff(
				{ title: "Old", count: 1, unchanged: true },
				{ title: "New", count: 1, unchanged: false },
				["title", "count"],
			),
		).toEqual({
				oldValue: { title: "Old" },
				newValue: { title: "New" },
			});
	});

	it("treats missing and null values as equivalent", () => {
		expect(
			captureAuditDiff(
				{ value: undefined },
				{ value: null },
				["value"],
			),
		).toEqual({ oldValue: {}, newValue: {} });
	});
});
