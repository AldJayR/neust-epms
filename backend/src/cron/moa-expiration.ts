import { and, eq, isNull, lte } from "drizzle-orm";
import cron from "node-cron";
import { db } from "../db/client.js";
import { moas } from "../db/schema/moas.js";
import { partners } from "../db/schema/partners.js";
import { env } from "../env.js";

/**
 * SYS-REQ-04.2: Scheduled background process that evaluates MOA expiration dates
 * against the system clock and sends notifications for expired MOAs.
 *
 * Runs every day at 01:00 AM.
 * Note: `isExpired` column removed; expiration is now computed dynamically
 * by comparing `validUntil` against the current time.
 */
export function startMoaExpirationCron(): void {
	cron.schedule("0 1 * * *", async () => {
		console.log(
			`[CRON] MOA expiration check started at ${new Date().toISOString()}`,
		);

		try {
			const now = new Date();

			// Find MOAs that have expired (validUntil <= now) and are not archived
			const expiredMoas = await db
				.select({
					moaId: moas.moaId,
					partnerName: partners.partnerName,
					validUntil: moas.validUntil,
				})
				.from(moas)
				.innerJoin(partners, eq(moas.partnerId, partners.partnerId))
				.where(and(lte(moas.validUntil, now), isNull(moas.archivedAt)));

			if (expiredMoas.length === 0) {
				console.log("[CRON] No expired MOAs found.");
				return;
			}

			console.log(`[CRON] Found ${expiredMoas.length} expired MOA(s).`);

			// Dispatch email notifications if Resend is configured
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

		for (const moa of expiredMoas) {
			await resend.emails.send({
				from: env.RESEND_FROM ?? "noreply@neust.edu.ph",
				to: env.RESEND_FROM ?? "admin@neust.edu.ph",
				subject: `MOA Expired: ${moa.partnerName}`,
				text: `The MOA with ${moa.partnerName} (ID: ${moa.moaId}) expired on ${moa.validUntil.toISOString()}.`,
			});
		}

		console.log(
			`[CRON] Sent ${expiredMoas.length} expiration email(s) via Resend.`,
		);
	} catch {
		console.warn(
			"[CRON] Email sending skipped — Resend not available or misconfigured.",
		);
	}
}
