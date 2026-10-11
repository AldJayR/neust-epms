import { and, eq, gte, ilike, lt, or, type SQL, sql } from "drizzle-orm";
import { auditLogs } from "@/db/schema/audit-logs.js";
import { users } from "@/db/schema/users.js";

export const AUDIT_ACTION_TYPES = ["Approval", "Upload", "Login", "Status", "Account", "System"] as const;
export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number];
export interface AuditFilters {
	search?: string | undefined;
	actionType?: AuditActionType | undefined;
	action?: string | undefined;
	module?: string | undefined;
	userId?: string | undefined;
	dateFrom?: string | undefined;
	dateTo?: string | undefined;
}

export function auditActionTypeExpression() {
	return sql<AuditActionType>`CASE
		WHEN ${auditLogs.tableAffected} IN ('proposals', 'proposal_reviews') AND lower(${auditLogs.action}) ~ '(approved|endorsed|rejected|returned|institutional approval)' THEN 'Approval'
		WHEN lower(${auditLogs.action}) ~ '(submitted|upload)' THEN 'Upload'
		WHEN lower(${auditLogs.action}) ~ '(login|logged in)' THEN 'Login'
		WHEN lower(${auditLogs.action}) ~ '(status|closed project|activated project|applied moa validity)' THEN 'Status'
		WHEN ${auditLogs.tableAffected} = 'users' OR lower(${auditLogs.action}) LIKE '%account%' THEN 'Account'
		ELSE 'System' END`;
}

function pattern(value: string) {
	return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

/** Applied before pagination, identically to the row query and its count. */
export function buildAuditFilters(filters: AuditFilters): SQL | undefined {
	const conditions: (SQL | undefined)[] = [];
	if (filters.search) {
		const search = pattern(filters.search);
		conditions.push(or(ilike(auditLogs.action, search), ilike(users.firstName, search), ilike(users.lastName, search), ilike(users.email, search), ilike(auditLogs.tableAffected, search)));
	}
	if (filters.action) conditions.push(ilike(auditLogs.action, pattern(filters.action)));
	if (filters.actionType) conditions.push(eq(auditActionTypeExpression(), filters.actionType));
	if (filters.module) conditions.push(eq(auditLogs.tableAffected, filters.module));
	if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
	if (filters.dateFrom) conditions.push(gte(auditLogs.createdAt, new Date(`${filters.dateFrom}T00:00:00.000Z`)));
	if (filters.dateTo) {
		const end = new Date(`${filters.dateTo}T00:00:00.000Z`);
		end.setUTCDate(end.getUTCDate() + 1);
		conditions.push(lt(auditLogs.createdAt, end));
	}
	return and(...conditions);
}
