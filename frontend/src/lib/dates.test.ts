import { describe, expect, it } from "vitest";
import {
	manilaCalendarTimestamp,
	reportingDeadline,
	toDateOnly,
	toManilaDisplayDate,
} from "./dates";

describe("Manila business dates", () => {
	it("round-trips a calendar day through an actual timestamp", () => {
		const timestamp = manilaCalendarTimestamp("2026-10-09");
		expect(timestamp).toBe("2026-10-08T16:00:00.000Z");
		expect(toDateOnly(toManilaDisplayDate(timestamp))).toBe("2026-10-09");
	});
	it("keeps the selected expiration day valid through its end", () => {
		expect(manilaCalendarTimestamp("2026-10-09", true)).toBe(
			"2026-10-09T15:59:59.999Z",
		);
		expect(reportingDeadline("2026-10-09").toISOString()).toBe(
			"2026-10-09T15:59:59.999Z",
		);
	});
	it("does not shift timestamp deadlines when computing overdue state", () => {
		const deadline = "2026-10-09T15:59:59.999Z";
		expect(reportingDeadline(deadline).getTime()).toBe(Date.parse(deadline));
	});
});
