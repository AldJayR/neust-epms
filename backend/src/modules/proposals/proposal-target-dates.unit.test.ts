import { describe, expect, it } from "vitest";
import { validateTargetDates } from "./proposal-target-dates.js";

describe("proposal target dates", () => {
	it("permits incomplete drafts but rejects invalid or non-increasing date pairs", () => {
		expect(() => validateTargetDates(null, null)).not.toThrow();
		expect(() => validateTargetDates("2026-10-09", null)).not.toThrow();
		expect(() => validateTargetDates("invalid", null)).toThrow();
		expect(() => validateTargetDates("2026-10-09", "2026-10-09")).toThrow();
		expect(() => validateTargetDates("2026-10-10", "2026-10-09")).toThrow();
		expect(() => validateTargetDates("2026-10-09", "2026-10-10")).not.toThrow();
	});
});
