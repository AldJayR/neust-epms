import { describe, expect, it } from "vitest";
import { buildTsQuery } from "./search-query.js";

describe("buildTsQuery", () => {
	it("normalizes tokens and joins them with prefix matching", () => {
		expect(buildTsQuery("  Proposal/MOA review! ")).toBe(
			"proposal:* & moa:* & review:*",
		);
	});

	it("limits the query to ten searchable tokens", () => {
		expect(buildTsQuery("one two three four five six seven eight nine ten eleven")).toBe(
			"one:* & two:* & three:* & four:* & five:* & six:* & seven:* & eight:* & nine:* & ten:*",
		);
	});

	it("rejects input without searchable tokens", () => {
		expect(() => buildTsQuery("--- !!!")).toThrowError(
			"Search term contains no searchable tokens",
		);
	});
});
