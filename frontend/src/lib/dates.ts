const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MANILA_OFFSET = 8 * 60 * 60 * 1000;

/** Calendar dates stay literal; timestamps are displayed in Asia/Manila.
 * The returned local Date is for formatting/calendar controls only, never arithmetic.
 */
export function toManilaDisplayDate(value: string | Date): Date {
	const date =
		typeof value === "string" && DATE_ONLY.test(value)
			? new Date(`${value}T00:00:00Z`)
			: new Date(
					(value instanceof Date ? value.getTime() : Date.parse(value)) +
						MANILA_OFFSET,
				);
	return new Date(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate(),
		date.getUTCHours(),
		date.getUTCMinutes(),
		date.getUTCSeconds(),
		date.getUTCMilliseconds(),
	);
}

/** Serialize a calendar selection without UTC shifting the selected day. */
export function toDateOnly(value: Date): string {
	return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

/** Store a business calendar day as an actual Manila instant. */
export function manilaCalendarTimestamp(
	value: Date | string,
	endOfDay = false,
): string {
	const day = typeof value === "string" ? value : toDateOnly(value);
	if (!DATE_ONLY.test(day)) throw new Error("A calendar date is required.");
	return new Date(
		`${day}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+08:00`,
	).toISOString();
}

/** A date-only deadline expires at the end of that day in Manila. */
export function reportingDeadline(value: string): Date {
	return new Date(
		DATE_ONLY.test(value) ? `${value}T23:59:59.999+08:00` : value,
	);
}
