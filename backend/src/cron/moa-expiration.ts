import { and, eq, gt, isNull, lte } from "drizzle-orm";
import cron from "node-cron";
import { db } from "../db/client.js";
import { moas } from "../db/schema/moas.js";
import { partners } from "../db/schema/partners.js";
import { projects } from "../db/schema/projects.js";
import { roles } from "../db/schema/roles.js";
import { users } from "../db/schema/users.js";
import { env } from "../env.js";
import { insertAuditLog } from "../lib/audit.js";
import {
	createNotification,
	getUserIdsByRole,
} from "../lib/notification.helpers.js";

/**
 * SYS-REQ-04.2: Scheduled background process that evaluates MOA expiration dates
 * against the system clock and sends notifications for expired MOAs.
 *
 * Runs every day at 01:00 AM.
 * Note: `isExpired` column removed; expiration is now computed dynamically
 * by comparing `validUntil` against the current time.
 */
async function getSystemExecutorId(): Promise<string | null> {
	try {
		const [dir] = await db
			.select({ userId: users.userId })
			.from(users)
			.innerJoin(roles, eq(users.roleId, roles.roleId))
			.where(eq(roles.roleName, "Director"))
			.limit(1);
		if (dir) return dir.userId;

		const [admin] = await db
			.select({ userId: users.userId })
			.from(users)
			.innerJoin(roles, eq(users.roleId, roles.roleId))
			.where(eq(roles.roleName, "Super Admin"))
			.limit(1);
		if (admin) return admin.userId;

		const [anyUser] = await db
			.select({ userId: users.userId })
			.from(users)
			.limit(1);
		if (anyUser) return anyUser.userId;
	} catch (e) {
		console.error("[CRON] Error finding system user for audit logging:", e);
	}
	return null;
}

export function startMoaExpirationCron(): void {
	cron.schedule("0 1 * * *", async () => {
		console.log(
			`[CRON] MOA expiration check started at ${new Date().toISOString()}`,
		);

		try {
			const now = new Date();
			// Use a 48-hour window instead of 24h to tolerate brief downtime
			const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);

			// Find MOAs that expired within the window and are not archived
			const expiredMoas = await db
				.select({
					moaId: moas.moaId,
					partnerName: partners.partnerName,
					validUntil: moas.validUntil,
				})
				.from(moas)
				.innerJoin(partners, eq(moas.partnerId, partners.partnerId))
				.where(
					and(
						lte(moas.validUntil, now),
						gt(moas.validUntil, windowStart),
						isNull(moas.archivedAt),
					),
				);

			if (expiredMoas.length === 0) {
				console.log("[CRON] No expired MOAs found.");
				return;
			}

			console.log(`[CRON] Found ${expiredMoas.length} expired MOA(s).`);

			// Create in-app notifications for Director(s) and flag linked projects as Expired
			const directorIds = await getUserIdsByRole("Director");
			const systemUserId = await getSystemExecutorId();

			for (const moa of expiredMoas) {
				const expiryDate = moa.validUntil.toLocaleDateString();
				for (const directorId of directorIds) {
					await createNotification({
						recipientId: directorId,
						type: "moa_expiry",
						title: "MOA Expiration Alert",
						message: `MOA with "${moa.partnerName}" expired on ${expiryDate}. Please renew.`,
						sendEmail: true,
						emailSubject: `MOA Expired: ${moa.partnerName}`,
						emailHtml: `<p>MOA with "<strong>${moa.partnerName}</strong>" expired on <strong>${expiryDate}</strong>. Please renew.</p>`,
					});
				}

				// Flag projects linked to this expired MOA as Expired
				const affectedProjects = await db
					.update(projects)
					.set({
						projectStatus: "Expired",
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(projects.moaId, moa.moaId),
							eq(projects.projectStatus, "Ongoing"),
							isNull(projects.archivedAt),
						),
					)
					.returning({ projectId: projects.projectId });

				if (affectedProjects.length > 0 && systemUserId) {
					for (const p of affectedProjects) {
						await insertAuditLog({
							userId: systemUserId,
							action: `Flagged project ${p.projectId} status as Expired due to MOA expiration`,
							tableAffected: "projects",
							ipAddress: "127.0.0.1",
						});
					}
				}
			}

			// Dispatch legacy email notifications if Resend is configured
			if (env.RESEND_API_KEY && env.RESEND_FROM) {
				await sendExpirationEmails(expiredMoas);
			}
		} catch (err) {
			console.error("[CRON] MOA expiration check failed:", err);
		}
	});

	console.log("[CRON] MOA expiration cron job scheduled (daily at 01:00).");
}

/**
 * Sends email notifications for expired MOAs via Resend.
 * Uses Promise.allSettled so one failure does not abort the rest.
 * Includes a small delay between sends to respect Resend's rate limits.
 */
async function sendExpirationEmails(
	expiredMoas: Array<{
		moaId: string;
		partnerName: string;
		validUntil: Date;
	}>,
): Promise<void> {
	try {
		const { Resend } = await import("resend");
		const resend = new Resend(env.RESEND_API_KEY);

		const results = await Promise.allSettled(
			expiredMoas.map(async (moa, i) => {
				// Throttle: ~2 req/s to respect Resend rate limits
				if (i > 0) await new Promise((r) => setTimeout(r, 500));
				return resend.emails.send({
					from: env.RESEND_FROM ?? "noreply@neust.edu.ph",
					to: env.ADMIN_EMAIL ?? "admin@neust.edu.ph",
					subject: `MOA Expired: ${moa.partnerName}`,
					text: `The MOA with ${moa.partnerName} (ID: ${moa.moaId}) expired on ${moa.validUntil.toISOString()}.`,
				});
			}),
		);

		const succeeded = results.filter((r) => r.status === "fulfilled").length;
		const failed = results.filter((r) => r.status === "rejected");
		if (failed.length > 0) {
			for (const f of failed) {
				console.error(`[CRON] Email send failed:`, f.reason);
			}
		}
		console.log(
			`[CRON] Sent ${succeeded}/${expiredMoas.length} expiration email(s) via Resend.`,
		);
	} catch {
		console.warn(
			"[CRON] Email sending skipped — Resend not available or misconfigured.",
		);
	}
}
