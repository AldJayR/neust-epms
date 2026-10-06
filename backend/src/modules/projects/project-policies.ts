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
				"The project must be approved before it can start.",
			);
		}

		if (!project.moaId) {
			throw new ApiError(
				400,
				"MOA_REQUIRED",
				"Link an active MOA before starting the project.",
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
			"Only ongoing projects can be marked as completed.",
		);
	}
}
