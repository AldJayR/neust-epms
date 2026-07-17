import { describe, expect, it } from "vitest";
import type { ScheduledDueDate } from "./reporting-schedule.functions";
import { canSubmitMilestone } from "./reporting-schedule.functions";

const milestone = (isCompleted: boolean): ScheduledDueDate => ({
	 id: crypto.randomUUID(),
	 date: "2026-01-01T00:00:00.000Z",
	 isCompleted,
	 completedAt: isCompleted ? "2026-01-02T00:00:00.000Z" : null,
	 reportType: "Progress",
	 reportId: null,
	 storagePath: null,
});

describe("canSubmitMilestone", () => {
	it("allows the first incomplete milestone", () => {
		expect(canSubmitMilestone([milestone(false)], 0)).toBe(true);
	});

	it("keeps later milestones locked until all previous milestones are complete", () => {
		const milestones = [milestone(true), milestone(false), milestone(false)];

		expect(canSubmitMilestone(milestones, 1)).toBe(true);
		expect(canSubmitMilestone(milestones, 2)).toBe(false);
	});

	it("does not allow an already completed milestone to be submitted again", () => {
		expect(canSubmitMilestone([milestone(true)], 0)).toBe(false);
	});
});
