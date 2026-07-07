import { db } from "../db/client.js";
import { auditLogs } from "../db/schema/audit-logs.js";

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
		oldValue: params.oldValue ?? null,
		newValue: params.newValue ?? null,
		ipAddress: params.ipAddress ?? null,
	});
}
