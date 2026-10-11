import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { moas } from "@/db/schema/moas.js";
import { projectReportingMilestones } from "@/db/schema/project-reporting-milestones.js";
import { projects } from "@/db/schema/projects.js";
import { insertAuditLog } from "@/lib/audit.js";
import { isMoaCurrentlyValid } from "@/lib/moa-validity.js";
import { PROJECT_STATUS } from "@/lib/types.js";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Moa = typeof moas.$inferSelect;
const SYNCABLE_STATUSES = [PROJECT_STATUS.ONGOING, PROJECT_STATUS.OVERDUE, PROJECT_STATUS.EXPIRED];

/** Caller holds the MOA lock; all project changes and audit records share its transaction. */
export async function syncProjectsToMoa(
	tx: Transaction,
	moa: Moa,
	userId: string,
	ipAddress: string | null,
	now = new Date(),
) {
	const valid = isMoaCurrentlyValid(moa, now);
	const previous = valid ? await tx.select({ moaId: moas.moaId }).from(moas).where(and(
		eq(moas.partnerId, moa.partnerId),
		isNull(moas.archivedAt),
		or(lt(moas.validFrom, moa.validFrom), and(eq(moas.validFrom, moa.validFrom), lt(moas.createdAt, moa.createdAt))),
	)) : [];
	const previousIds = previous.map((row) => row.moaId);
	const sourceCondition = valid
		? or(
			previousIds.length ? inArray(projects.moaId, previousIds) : undefined,
			and(eq(projects.moaId, moa.moaId), eq(projects.projectStatus, PROJECT_STATUS.EXPIRED)),
		)
		: and(eq(projects.moaId, moa.moaId), inArray(projects.projectStatus, [PROJECT_STATUS.ONGOING, PROJECT_STATUS.OVERDUE]));
	const linked = await tx.select({
		projectId: projects.projectId, moaId: projects.moaId, projectStatus: projects.projectStatus,
	}).from(projects).where(and(sourceCondition, inArray(projects.projectStatus, SYNCABLE_STATUSES), isNull(projects.archivedAt)))
		.orderBy(asc(projects.projectId)).for("update");

	for (const project of linked) {
		let status = valid ? project.projectStatus : PROJECT_STATUS.EXPIRED;
		if (valid && project.projectStatus === PROJECT_STATUS.EXPIRED) {
			const [overdue] = await tx.select({ id: projectReportingMilestones.milestoneId })
				.from(projectReportingMilestones).where(and(
					eq(projectReportingMilestones.projectId, project.projectId),
					isNull(projectReportingMilestones.completedAt),
					lt(projectReportingMilestones.dueAt, now),
				)).limit(1);
			status = overdue ? PROJECT_STATUS.OVERDUE : PROJECT_STATUS.ONGOING;
		}
		const [updated] = await tx.update(projects).set({
			moaId: valid ? moa.moaId : project.moaId,
			projectStatus: status,
			updatedAt: now,
		}).where(and(
			eq(projects.projectId, project.projectId),
			project.moaId ? eq(projects.moaId, project.moaId) : isNull(projects.moaId),
			eq(projects.projectStatus, project.projectStatus),
			isNull(projects.archivedAt),
		)).returning({ projectId: projects.projectId });
		if (!updated) continue;
		await insertAuditLog({
			userId,
			action: `Applied MOA validity to project ${project.projectId}`,
			tableAffected: "projects",
			oldValue: { moaId: project.moaId, projectStatus: project.projectStatus },
			newValue: { moaId: valid ? moa.moaId : project.moaId, projectStatus: status },
			ipAddress,
		}, tx);
	}
}

/** Picks one currently valid renewal per partner; future agreements stay untouched. */
export async function applyEffectiveMoaRenewals(fallbackUserId: string | null, now = new Date()) {
	const candidates = await db.select().from(moas).where(and(
		isNull(moas.archivedAt), isNotNull(moas.storagePath), sql`trim(${moas.storagePath}) <> ''`, lte(moas.validFrom, now), gt(moas.validUntil, now),
	)).orderBy(asc(moas.partnerId), desc(moas.validFrom), desc(moas.createdAt));
	const seenPartners = new Set<string>();
	for (const candidate of candidates) {
		if (seenPartners.has(candidate.partnerId)) continue;
		seenPartners.add(candidate.partnerId);
		const actorId = candidate.uploadedBy ?? fallbackUserId;
		if (!actorId) continue;
		try {
			await db.transaction(async (tx) => {
				const [current] = await tx.select().from(moas).where(eq(moas.moaId, candidate.moaId)).for("update").limit(1);
				if (current && isMoaCurrentlyValid(current, now)) await syncProjectsToMoa(tx, current, actorId, "127.0.0.1", now);
			});
		} catch (error) {
			console.error("[CRON] Failed to apply MOA renewal:", candidate.moaId, error);
		}
	}
}
