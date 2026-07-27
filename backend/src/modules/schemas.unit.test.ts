import { describe, expect, it } from "vitest";
import { RegisterUserBodySchema } from "./auth/auth.schema.js";
import { UpdateMoaSchema } from "./moas/moas.schema.js";
import { ActivateSchema } from "./projects/projects.schema.js";
import { CreateProposalSchema, ReviewProposalSchema } from "./proposals/proposals.schema.js";
import { SearchQuerySchema } from "./search/search.schema.js";

describe("module request schemas", () => {
	it("requires a non-empty extension-service selection for proposals", () => {
		const result = CreateProposalSchema.safeParse({
			campusId: 1,
			departmentId: 2,
			title: "Community Health",
			bannerProgram: "Health",
			projectLocale: "San Isidro",
			extensionServiceIds: [],
		});

		expect(result.success).toBe(false);
	});

	it("rejects duplicate extension services", () => {
		const result = CreateProposalSchema.safeParse({
			campusId: 1,
			departmentId: 2,
			title: "Community Health",
			bannerProgram: "Health",
			projectLocale: "San Isidro",
			extensionServiceIds: [1, 1],
		});

		expect(result.success).toBe(false);
	});

	it("accepts a valid proposal review decision", () => {
		expect(ReviewProposalSchema.parse({ decision: "Approved" })).toEqual({
			decision: "Approved",
		});
	});

	it("requires a UUID and at least one milestone for activation", () => {
		expect(
			ActivateSchema.safeParse({
				moaId: "123e4567-e89b-12d3-a456-426614174000",
				milestones: [],
			}).success,
		).toBe(false);
	});

	it("validates MOA date updates as ISO datetimes", () => {
		expect(
			UpdateMoaSchema.safeParse({ validUntil: "2026-12-31T00:00:00.000Z" }).success,
		).toBe(true);
		expect(UpdateMoaSchema.safeParse({ validUntil: "2026-12-31" }).success).toBe(false);
	});

	it("coerces search limits and defaults the search type", () => {
		expect(SearchQuerySchema.parse({ q: "proposal", limit: "10" })).toMatchObject({
			q: "proposal",
			type: "all",
			limit: 10,
		});
	});

	it("rejects passwords shorter than eight characters during registration", () => {
		const result = RegisterUserBodySchema.safeParse({
			firstName: "Test",
			lastName: "User",
			email: "test@neust.edu.ph",
			password: "short",
			campusId: 1,
		});

		expect(result.success).toBe(false);
	});
});
