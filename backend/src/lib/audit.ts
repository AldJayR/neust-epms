import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/audit-logs.js";

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

/**
 * Insert an audit log entry for a critical transition.
 * Called within route handlers after state-changing operations.
 */
export async function insertAuditLog(
	params: {
		userId: string;
		action: string;
		tableAffected: string;
		oldValue?: Record<string, unknown> | null;
		newValue?: Record<string, unknown> | null;
		ipAddress?: string | null;
	},
	executor: Pick<typeof db, "insert"> = db,
): Promise<void> {
	await executor.insert(auditLogs).values({
		userId: params.userId,
		action: params.action,
		tableAffected: params.tableAffected,
		oldValue:
			(sanitizeAuditValue(params.oldValue) as Record<string, unknown> | null) ??
			null,
		newValue:
			(sanitizeAuditValue(params.newValue) as Record<string, unknown> | null) ??
			null,
		ipAddress: params.ipAddress ?? null,
	});
}
