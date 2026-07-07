/**
 * Utility for capturing changes between two states of an object for audit logging.
 */

export function captureAuditDiff<T extends Record<string, unknown>>(
	before: T,
	after: T,
	sensitiveKeys: (keyof T)[],
): { oldValue: Partial<T>; newValue: Partial<T> } {
	const oldValue: Partial<T> = {};
	const newValue: Partial<T> = {};

	for (const key of sensitiveKeys) {
		const beforeVal = JSON.stringify(before[key] ?? null);
		const afterVal = JSON.stringify(after[key] ?? null);
		if (beforeVal !== afterVal) {
			oldValue[key] = before[key];
			newValue[key] = after[key];
		}
	}

	return { oldValue, newValue };
}
