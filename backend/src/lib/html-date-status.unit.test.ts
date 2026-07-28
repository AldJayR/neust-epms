import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	formatDuration,
	getCurrentAcademicYear,
	getCurrentSemester,
} from "./date.utils.js";
import { escapeHtml } from "./html.js";
import {
	getProjectStatusDescription,
	getProposalStatusDescription,
} from "./status-descriptions.js";

describe("escapeHtml", () => {
	it("escapes every HTML metacharacter", () => {
		expect(escapeHtml(`<script title="x">'&</script>`)).toBe(
			"&lt;script title=&quot;x&quot;&gt;&#39;&amp;&lt;/script&gt;",
		);
	});

	it("converts numeric values to text", () => {
		expect(escapeHtml(42)).toBe("42");
	});
});

describe("formatDuration", () => {
	it("formats years and remaining months", () => {
		expect(
			formatDuration(new Date("2024-01-01"), new Date("2026-04-01")),
		).toBe("2 yr(s) 3 mo(s)");
	});

	it("returns zero months for the same month", () => {
		expect(
			formatDuration(new Date("2026-04-01"), new Date("2026-04-01")),
		).toBe("0 mo(s)");
	});
});

describe("academic calendar helpers", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("starts the academic year in August", () => {
		vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));
		expect(getCurrentAcademicYear()).toBe("2026-2027");
		expect(getCurrentSemester()).toBe(1);
	});

	it("keeps January in the first semester of the academic year", () => {
		vi.setSystemTime(new Date("2027-01-15T00:00:00Z"));
		expect(getCurrentAcademicYear()).toBe("2026-2027");
		expect(getCurrentSemester()).toBe(1);
	});

	it("uses the second semester from February through July", () => {
		vi.setSystemTime(new Date("2027-02-01T00:00:00Z"));
		expect(getCurrentSemester()).toBe(2);
	});
});

describe("status descriptions", () => {
	it("returns the configured proposal description", () => {
		expect(getProposalStatusDescription("Returned")).toMatchObject({
			label: "Revision Required",
			nextStep: "Review feedback and submit a revised proposal.",
		});
	});

	it("returns a safe fallback for an unknown project status", () => {
		expect(getProjectStatusDescription("Unknown")).toEqual({
			label: "Unknown",
			explanation: "Status: Unknown",
			nextStep: "N/A",
		});
	});
});
