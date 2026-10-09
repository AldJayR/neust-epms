import { ApiError } from "@/lib/errors.js";
import { PROJECT_STATUS } from "@/lib/types.js";

export interface ProjectTransitionInput {
	projectId: string;
	projectStatus: string;
	moaId: string | null;
}

export function validateProjectTransition(
	_project: ProjectTransitionInput,
	targetStatus: string,
): void {
	if (
		targetStatus === PROJECT_STATUS.ONGOING ||
		targetStatus === PROJECT_STATUS.COMPLETED
	) {
		throw new ApiError(
			400,
			"DEPRECATED_TRANSITION",
			"Use project activation with an MOA and reporting schedule, or Director closure approval with a complete unified terminal package.",
		);
	}
	throw new ApiError(
		400,
		"INVALID_TRANSITION",
		"Unsupported project transition",
	);
}

export function isActivationMoaValid(
	moa: {
		validFrom: Date;
		validUntil: Date;
		archivedAt: Date | null;
		storagePath: string | null;
	},
	now = new Date(),
): boolean {
	return (
		!moa.archivedAt &&
		Boolean(moa.storagePath?.trim()) &&
		moa.validFrom <= now &&
		now < moa.validUntil
	);
}

export function reportingScheduleError(
	milestones: Array<{ reportType: string; dueAt: string }>,
): string | null {
	const closure = milestones.filter(
		(m) =>
			m.reportType === "Terminal Report" || m.reportType === "Project Closure",
	);
	const finalClosure = closure[0];
	if (closure.length !== 1 || !finalClosure)
		return "Schedule exactly one final closure milestone.";
	const closureTime = new Date(finalClosure.dueAt).getTime();
	const dates = new Set<number>();
	for (const milestone of milestones) {
		const time = new Date(milestone.dueAt).getTime();
		if (!Number.isFinite(time))
			return "Every milestone needs a valid due date.";
		if (dates.has(time))
			return "Duplicate milestone due dates are not allowed.";
		dates.add(time);
		if (milestone.reportType === "Progress") {
			if (time >= closureTime)
				return "Progress reports must be due before the final closure milestone.";
		} else if (milestone !== finalClosure) {
			return "Unsupported reporting milestone type.";
		}
	}
	return null;
}
