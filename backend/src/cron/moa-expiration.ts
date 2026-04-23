import cron from "node-cron";
import { and, lte, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { moas } from "../db/schema/moas.js";
import { env } from "../env.js";

/**
 * SYS-REQ-04.2: Scheduled background process that evaluates MOA expiration dates
 * against the system clock and marks expired MOAs.
 *
 * Runs every day at 01:00 AM.
 */
export function startMoaExpirationCron(): void {
  cron.schedule("0 1 * * *", async () => {
    console.log(
      `[CRON] MOA expiration check started at ${new Date().toISOString()}`,
    );

    try {
      const now = new Date();

      // Mark expired MOAs in one statement and return changed rows for notification.
      const expiredMoas = await db
        .update(moas)
        .set({ isExpired: true, updatedAt: now })
        .where(
          and(
            eq(moas.isExpired, false),
            lte(moas.validUntil, now),
            isNull(moas.archivedAt),
          ),
        )
        .returning({
          moaId: moas.moaId,
          partnerName: moas.partnerName,
          validUntil: moas.validUntil,
        });

      if (expiredMoas.length === 0) {
        console.log("[CRON] No newly expired MOAs found.");
        return;
      }

      console.log(
        `[CRON] Marked ${expiredMoas.length} MOA(s) as expired.`,
      );

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
