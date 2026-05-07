import { db } from "../db/client.js";
import { auditLogs } from "../db/schema/audit-logs.js";

/**
 * Insert an audit log entry for a critical transition.
 * Called within route handlers after state-changing operations.
 */
export async function insertAuditLog(params: {
  userId: string;
  action: string;
  tableAffected: string;
  ipAddress?: string | null;
}, executor: Pick<typeof db, "insert"> = db): Promise<void> {
  await executor.insert(auditLogs).values({
    userId: params.userId,
    action: params.action,
    tableAffected: params.tableAffected,
    ipAddress: params.ipAddress ?? null,
  });
}
