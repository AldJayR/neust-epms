const SENSITIVE_KEY_PATTERN =
	/(password|token|secret|authorization|reset|filecontent|rawcontent|annotation|remarks|email|phone|address|government|license)/i;

export function sanitizeAuditValue(value: unknown, key?: string): unknown {
	if (key && SENSITIVE_KEY_PATTERN.test(key)) return "[REDACTED]";
	if (value === null || value === undefined) return value;
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) {
		return value.map((item) => sanitizeAuditValue(item));
	}
	if (typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(
				([entryKey, entryValue]) => [
					entryKey,
					sanitizeAuditValue(entryValue, entryKey),
				],
			),
		);
	}
	return value;
}
