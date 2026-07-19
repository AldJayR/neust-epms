import { describe, expect, it } from "vitest";
import {
	CreateProposalSchema,
	UpdateProposalSchema,
} from "./proposals.schema.js";

describe("proposal extension services schema", () => {
	it("accepts one or more extension service IDs when creating a proposal", () => {
		const result = CreateProposalSchema.safeParse({
			campusId: 1,
			departmentId: 1,
			title: "Community Health Extension Program",
			bannerProgram: "Health and Wellness",
			projectLocale: "San Isidro, Nueva Ecija",
			extensionServiceIds: [1, 3],
		});

		expect(result.success).toBe(true);
	});

	it("rejects a proposal with no extension services", () => {
		const result = CreateProposalSchema.safeParse({
			campusId: 1,
			departmentId: 1,
			title: "Community Health Extension Program",
			bannerProgram: "Health and Wellness",
			projectLocale: "San Isidro, Nueva Ecija",
			extensionServiceIds: [],
		});

		expect(result.success).toBe(false);
	});

	it("accepts extension service changes when updating a proposal", () => {
		const result = UpdateProposalSchema.safeParse({
			extensionServiceIds: [2],
		});

		expect(result.success).toBe(true);
	});
});
