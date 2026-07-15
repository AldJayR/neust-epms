import { describe, expect, it } from "vitest";
import { ActivateSchema } from "./projects.schema.js";

describe("ActivateSchema", () => {
	it("accepts typed reporting milestones without a frequency", () => {
		const result = ActivateSchema.safeParse({
			moaId: "11111111-1111-4111-8111-111111111111",
			milestones: [
				{
					reportType: "Progress",
					dueAt: "2026-09-30T00:00:00.000Z",
				},
			],
		});

		expect(result.success).toBe(true);
	});
});
