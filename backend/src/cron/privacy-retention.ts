import { and, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import cron from "node-cron";
import { db } from "@/db/client.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { roles } from "@/db/schema/roles.js";
import { specialOrders } from "@/db/schema/special-orders.js";
import { systemSettings } from "@/db/schema/system-settings.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { PROJECT_STATUS, ROLE_NAMES } from "@/lib/types.js";

const RETENTION_SETTING_KEY = "project_retention_years";
const DEFAULT_RETENTION_YEARS = 10;

type RetentionOptions = { dryRun?: boolean };

async function getRetentionYears(): Promise<number> {
	const [setting] = await db
		.select({ value: systemSettings.settingValue })
		.from(systemSettings)
		.where(eq(systemSettings.settingKey, RETENTION_SETTING_KEY))
		.limit(1);

	const value = Number(setting?.value ?? DEFAULT_RETENTION_YEARS);
	if (!Number.isInteger(value) || value < 1 || value > 100) {
		throw new Error(
			`Invalid ${RETENTION_SETTING_KEY}; expected an integer between 1 and 100`,
		);
	}

	return value;
}

async function getSystemExecutorId(): Promise<string> {
	const [executor] = await db
		.select({ userId: users.userId })
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.where(
			and(
				eq(users.isActive, true),
				inArray(roles.roleName, [ROLE_NAMES.SUPER_ADMIN, ROLE_NAMES.DIRECTOR]),
			),
		)
		.limit(1);

	if (!executor) {
		throw new Error("Cannot archive records without an active system executor");
	}

	return executor.userId;
}

function retentionBoundary(now: Date, years: number): Date {
	const boundary = new Date(now);
	boundary.setUTCFullYear(boundary.getUTCFullYear() - years);
	return boundary;
}

export async function archiveExpiredProjects(
	now = new Date(),
	options: RetentionOptions = {},
): Promise<{ scanned: number; archived: number; dryRun: boolean }> {
	const retentionYears = await getRetentionYears();
	const boundary = retentionBoundary(now, retentionYears);
	const candidates = await db
		.select({ projectId: projects.projectId, proposalId: projects.proposalId })
		.from(projects)
		.where(
			and(
				eq(projects.projectStatus, PROJECT_STATUS.CLOSED),
				isNull(projects.archivedAt),
				eq(projects.onHold, false),
				isNotNull(projects.actualEndDate),
				lt(projects.actualEndDate, boundary),
			),
		);

	if (options.dryRun || candidates.length === 0) {
		return {
			scanned: candidates.length,
			archived: 0,
			dryRun: options.dryRun === true,
		};
	}

	const executorId = await getSystemExecutorId();
	let archivedCount = 0;

	for (const candidate of candidates) {
		const archived = await db.transaction(async (tx) => {
			const archivedAt = now;
			const [archivedProject] = await tx
				.update(projects)
				.set({ archivedAt, updatedAt: now })
				.where(
					and(
						eq(projects.projectId, candidate.projectId),
						isNull(projects.archivedAt),
						eq(projects.onHold, false),
					),
				)
				.returning({ projectId: projects.projectId });

			if (!archivedProject) return false;

			await tx
				.update(proposals)
				.set({ archivedAt, updatedAt: now })
				.where(
					and(
						eq(proposals.proposalId, candidate.proposalId),
						isNull(proposals.archivedAt),
					),
				);

			await tx
				.update(projectReports)
				.set({ archivedAt })
				.where(
					and(
						eq(projectReports.projectId, candidate.projectId),
						isNull(projectReports.archivedAt),
					),
				);

			const memberRows = await tx
				.select({ memberId: proposalMembers.memberId })
				.from(proposalMembers)
				.where(eq(proposalMembers.proposalId, candidate.proposalId));
			const memberIds = memberRows.map((row) => row.memberId);
			if (memberIds.length > 0) {
				await tx
					.update(specialOrders)
					.set({ archivedAt, updatedAt: now })
					.where(
						and(
							inArray(specialOrders.memberId, memberIds),
							isNull(specialOrders.archivedAt),
						),
					);
			}

			await insertAuditLog(
				{
					userId: executorId,
					action: `Archived project ${candidate.projectId} for retention`,
					tableAffected: "projects",
					newValue: {
						archivedAt: archivedAt.toISOString(),
						retentionYears,
					},
				},
				tx,
			);

			return true;
		});

		if (archived) archivedCount++;
	}

	return { scanned: candidates.length, archived: archivedCount, dryRun: false };
}

export function startPrivacyRetentionCron(): void {
	cron.schedule("0 3 * * 0", async () => {
		try {
			const result = await archiveExpiredProjects();
			console.log(
				`[CRON] Privacy retention archived ${result.archived} of ${result.scanned} expired project(s).`,
			);
		} catch (error) {
			console.error("[CRON] Privacy retention failed:", error);
		}
	});
	console.log(
		"[CRON] Privacy retention job scheduled (weekly on Sunday at 03:00).",
	);
}
