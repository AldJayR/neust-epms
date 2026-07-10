import { describe, expect, it } from "vitest";
import { UserResponseSchema } from "./auth.schema.js";

describe("UserResponseSchema", () => {
	it("requires every field stored in the frontend AuthUser session", () => {
		const result = UserResponseSchema.safeParse({
			userId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
			firstName: "Faculty",
			middleName: null,
			lastName: "User",
			nameSuffix: null,
			academicRank: "Instructor",
			email: "faculty@neust.edu.ph",
			roleName: "Faculty",
			campusName: "Main Campus",
			departmentName: "MIS",
			isActive: true,
			hasCompletedOnboarding: false,
		});

		expect(result.success).toBe(false);
	});
});
