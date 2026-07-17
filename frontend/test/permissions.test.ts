import { describe, expect, it } from "vitest";
import { OPERATIONAL_ROLES } from "../src/lib/permissions";

describe("operational role permissions", () => {
	it("does not include Super Admin", () => {
		expect(OPERATIONAL_ROLES).not.toContain("Super Admin");
	});

	it("includes the project-facing roles", () => {
		expect(OPERATIONAL_ROLES).toEqual(["Director", "RET Chair", "Faculty"]);
	});
});
