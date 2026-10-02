import { describe, expect, it } from "vitest";
import { CreateReportSchema } from "./reports.schema.js";
const terminal = { milestoneId: "11111111-1111-4111-8111-111111111111", reportType: "Accomplishment and Terminal Report" };
describe("terminal trainee counts", () => {
	it("accepts explicit zero", () => expect(CreateReportSchema.safeParse({ ...terminal, traineeCount: 0 }).success).toBe(true));
	it.each([undefined, null, -1, 1.5, 2147483648, "10"])("rejects missing or invalid counts: %s", (traineeCount) => expect(CreateReportSchema.safeParse({ ...terminal, traineeCount }).success).toBe(false));
	it("rejects a trainee count on a progress report", () => expect(CreateReportSchema.safeParse({ ...terminal, reportType: "Progress", traineeCount: 10 }).success).toBe(false));
});
