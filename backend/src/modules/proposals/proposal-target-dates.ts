import { ApiError } from "@/lib/errors.js";

export function validateTargetDates(
	start: Date | string | null | undefined,
	end: Date | string | null | undefined,
): void {
	const startTime = start == null ? null : new Date(start).getTime();
	const endTime = end == null ? null : new Date(end).getTime();
	if (
		(startTime !== null && !Number.isFinite(startTime)) ||
		(endTime !== null && !Number.isFinite(endTime)) ||
		(startTime !== null && endTime !== null && startTime >= endTime)
	) {
		throw new ApiError(
			400,
			"INVALID_TARGET_DATES",
			"Target end date must be after target start date.",
		);
	}
}
