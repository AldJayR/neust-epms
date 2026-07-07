import { describe, expect, it } from "vitest";
import { captureAuditDiff } from "./audit-diff.js";

describe("captureAuditDiff", () => {
	it("should capture changed fields only", () => {
		const before = { title: "Old Title", budget: 100, status: "Draft" };
		const after = { title: "New Title", budget: 100, status: "Draft" };
		const result = captureAuditDiff(before, after, ["title", "budget", "status"]);
		expect(result.oldValue).toEqual({ title: "Old Title" });
		expect(result.newValue).toEqual({ title: "New Title" });
	});

	it("should ignore keys that are not specified in sensitiveKeys", () => {
		const before = { title: "Old Title", budget: 100 };
		const after = { title: "New Title", budget: 200 };
		const result = captureAuditDiff(before, after, ["title"]);
		expect(result.oldValue).toEqual({ title: "Old Title" });
		expect(result.newValue).toEqual({ title: "New Title" });
	});

	it("should handle null and undefined values correctly", () => {
		const before = { title: null, description: "Hello" } as unknown as Record<
			string,
			unknown
		>;
		const after = { title: "Title", description: undefined } as unknown as Record<
			string,
			unknown
		>;
		const result = captureAuditDiff(before, after, ["title", "description"]);
		expect(result.oldValue).toEqual({ title: null, description: "Hello" });
		expect(result.newValue).toEqual({ title: "Title", description: undefined });
	});
});
