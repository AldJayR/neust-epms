import { describe, expect, it } from "vitest";
import { csvCell } from "./analytics-csv.js";

describe("analytics CSV", () => {
	it("preserves explicit zero and empty unknown values", () => {
		expect(csvCell(0)).toBe('"0"'); expect(csvCell(null)).toBe('""');
	});
	it("escapes quotes, commas and newlines", () => {
		expect(csvCell('A, "B"\nC')).toBe('"A, ""B""\nC"');
	});
	it.each(["=1+1", "+SUM(A1)", "@SUM(A1)", "  -1+2"])("neutralizes spreadsheet formulas: %s", (value) => {
		expect(csvCell(value)).toBe(`"'${value}"`);
	});
});
