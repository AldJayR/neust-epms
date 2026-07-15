import type { z } from "@hono/zod-openapi";
import {
	and,
	count,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/audit-logs.js";
import { partners } from "@/db/schema/partners.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { proposals } from "@/db/schema/proposals.js";
import { roles } from "@/db/schema/roles.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import type { AuthUser } from "@/lib/types.js";
import { type AuditLogSchema, AuditValueSchema } from "./audit.schema.js";

type AuditLog = z.infer<typeof AuditLogSchema>;

export async function getAuditStats(): Promise<{
	totalActionsToday: number;
	uniqueUsersActive: number;
	accountChanges: number;
	failedLogins: number;
}> {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const [totalActionsResult, accountChangesResult, failedLoginsResult] =
		await Promise.all([
			db
				.select({ value: count() })
				.from(auditLogs)
				.where(gte(auditLogs.createdAt, today)),
			db
				.select({ value: count() })
				.from(auditLogs)
				.where(
					and(
						eq(auditLogs.tableAffected, "users"),
						gte(auditLogs.createdAt, today),
					),
				),
			db
				.select({ value: count() })
				.from(auditLogs)
				.where(
					and(
						ilike(auditLogs.action, "%failed login%"),
						gte(auditLogs.createdAt, today),
					),
				),
		]);

	const [uniqueUsersResult] = await db
		.select({ value: sql<number>`count(distinct ${auditLogs.userId})` })
		.from(auditLogs)
		.where(gte(auditLogs.createdAt, today));
	const uniqueUsersCount = Number(uniqueUsersResult?.value ?? 0);

	return {
		totalActionsToday: Number(totalActionsResult[0]?.value ?? 0),
		uniqueUsersActive: uniqueUsersCount,
		accountChanges: Number(accountChangesResult[0]?.value ?? 0),
		failedLogins: Number(failedLoginsResult[0]?.value ?? 0),
	};
}

export async function listAuditLogs(
	user: AuthUser,
	query: { page: number; limit: number; search?: string | undefined },
	ipAddress: string,
): Promise<{ items: AuditLog[]; total: number }> {
	const { page, limit, search } = query;
	const offset = (page - 1) * limit;

	await insertAuditLog({
		userId: user.userId,
		action: `Viewed audit logs (page ${page}, limit ${limit}${search ? `, search: ${search}` : ""})`,
		tableAffected: "audit_logs",
		ipAddress,
	});

	let whereClause: SQL | undefined;
	if (search) {
		whereClause = or(
			ilike(auditLogs.action, `${search}%`),
			ilike(users.firstName, `${search}%`),
			ilike(users.lastName, `${search}%`),
			ilike(users.email, `${search}%`),
		);
	}

	const [totalResult, rows] = await Promise.all([
		db
			.select({ value: count() })
			.from(auditLogs)
			.leftJoin(users, eq(auditLogs.userId, users.userId))
			.where(whereClause),
		db
			.select({
				logId: auditLogs.logId,
				userId: auditLogs.userId,
				action: auditLogs.action,
				tableAffected: auditLogs.tableAffected,
				oldValue: auditLogs.oldValue,
				newValue: auditLogs.newValue,
				ipAddress: auditLogs.ipAddress,
				createdAt: auditLogs.createdAt,
				actorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
				actorRole: roles.roleName,
			})
			.from(auditLogs)
			.leftJoin(users, eq(auditLogs.userId, users.userId))
			.leftJoin(roles, eq(users.roleId, roles.roleId))
			.where(whereClause)
			.orderBy(desc(auditLogs.createdAt))
			.limit(limit)
			.offset(offset),
	]);

	// Resolve names/labels for UUIDs present in rows
	const uuids = new Set<string>();
	const uuidRegex =
		/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
	for (const r of rows) {
		const matches = r.action.match(uuidRegex);
		if (matches) {
			for (const u of matches) {
				uuids.add(u.toLowerCase());
			}
		}
	}

	const lookup = new Map<string, string>();

	if (uuids.size > 0) {
		const uuidList = Array.from(uuids);
		const [proposalsList, projectsList, usersList, partnersList, reportsList] =
			await Promise.all([
				db
					.select({ id: proposals.proposalId, label: proposals.title })
					.from(proposals)
					.where(inArray(proposals.proposalId, uuidList)),
				db
					.select({ id: projects.projectId, label: proposals.title })
					.from(projects)
					.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
					.where(inArray(projects.projectId, uuidList)),
				db
					.select({
						id: users.userId,
						label: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
					})
					.from(users)
					.where(inArray(users.userId, uuidList)),
				db
					.select({ id: partners.partnerId, label: partners.partnerName })
					.from(partners)
					.where(inArray(partners.partnerId, uuidList)),
				db
					.select({
						id: projectReports.reportId,
						label: projectReports.reportType,
					})
					.from(projectReports)
					.where(inArray(projectReports.reportId, uuidList)),
			]);

		for (const p of proposalsList) lookup.set(p.id.toLowerCase(), p.label);
		for (const p of projectsList) lookup.set(p.id.toLowerCase(), p.label);
		for (const u of usersList) lookup.set(u.id.toLowerCase(), u.label);
		for (const pt of partnersList) lookup.set(pt.id.toLowerCase(), pt.label);
		for (const r of reportsList) lookup.set(r.id.toLowerCase(), r.label);
	}

	const items = rows.map((r) => {
		let action = r.action;
		action = action.replace(uuidRegex, (match) => {
			const label = lookup.get(match.toLowerCase());
			return label ? `"${label}"` : match;
		});
		return {
			...r,
			oldValue: AuditValueSchema.parse(r.oldValue ?? null),
			newValue: AuditValueSchema.parse(r.newValue ?? null),
			action,
			createdAt: r.createdAt.toISOString(),
		};
	});

	return { items, total: Number(totalResult[0]?.value ?? 0) };
}
