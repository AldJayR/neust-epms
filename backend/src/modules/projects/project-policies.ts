import { ApiError } from "@/lib/errors.js";
import { PROJECT_STATUS } from "@/lib/types.js";

export interface ProjectTransitionInput {
	projectId: string;
	projectStatus: string;
	moaId: string | null;
}

export function validateProjectTransition(
	project: ProjectTransitionInput,
	targetStatus: string,
): void {
	if (targetStatus === PROJECT_STATUS.ONGOING) {
		if (project.projectStatus !== PROJECT_STATUS.APPROVED) {
			throw new ApiError(
				400,
				"INVALID_TRANSITION",
				"Only Approved projects can transition to Ongoing",
			);
		}

		if (!project.moaId) {
			throw new ApiError(
				400,
				"MOA_REQUIRED",
				"An active MOA must be linked before transitioning to Ongoing (SYS-REQ-04.1)",
			);
		}
	}

	if (
		targetStatus === PROJECT_STATUS.COMPLETED &&
		project.projectStatus !== PROJECT_STATUS.ONGOING
	) {
		throw new ApiError(
			400,
			"INVALID_TRANSITION",
			"Only Ongoing projects can be marked as Completed",
		);
	}
}
