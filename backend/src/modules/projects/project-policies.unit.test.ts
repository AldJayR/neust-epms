import { describe, expect, it } from "vitest";
import { PROJECT_STATUS } from "@/lib/types.js";
import { validateProjectTransition } from "./project-policies.js";

const project = {
	projectId: "project-1",
	projectStatus: PROJECT_STATUS.APPROVED,
	moaId: "moa-1",
};

describe("validateProjectTransition", () => {
	it("allows an approved project with an MOA to become ongoing", () => {
		expect(() => validateProjectTransition(project, PROJECT_STATUS.ONGOING)).not.toThrow();
	});

	it("requires an MOA before an approved project becomes ongoing", () => {
		expect(() =>
			validateProjectTransition(
				{ ...project, moaId: null },
				PROJECT_STATUS.ONGOING,
			),
		).toThrowError("An active MOA must be linked before transitioning to Ongoing");
	});

	it("rejects completing a project that is not ongoing", () => {
		expect(() =>
			validateProjectTransition(project, PROJECT_STATUS.COMPLETED),
		).toThrowError("Only Ongoing projects can be marked as Completed");
	});
});
