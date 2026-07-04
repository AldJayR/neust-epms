import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { notifications } from "../db/schema/notifications.js";
import { roles } from "../db/schema/roles.js";
import { users } from "../db/schema/users.js";
import { env } from "../env.js";

export interface CreateNotificationOpts {
	recipientId: string;
	type: string;
	title: string;
	message: string;
	sendEmail?: boolean;
	emailSubject?: string;
	emailHtml?: string;
}

/**
 * Creates an in-app notification and optionally sends an email via Resend.
 * Email is best-effort — failures are logged but never thrown.
 */
export async function createNotification(
	opts: CreateNotificationOpts,
): Promise<void> {
	const {
		recipientId,
		type,
		title,
		message,
		sendEmail = false,
		emailSubject,
		emailHtml,
	} = opts;

	await db.insert(notifications).values({
		recipientId,
		type,
		title,
		message,
		isRead: false,
	});

	if (sendEmail && env.RESEND_API_KEY && env.RESEND_FROM) {
		const [user] = await db
			.select({ email: users.email })
			.from(users)
			.where(eq(users.userId, recipientId))
			.limit(1);

		if (user?.email) {
			try {
				const { Resend } = await import("resend");
				const resend = new Resend(env.RESEND_API_KEY);
				await resend.emails.send({
					from: env.RESEND_FROM,
					to: user.email,
					subject: emailSubject ?? title,
					html: emailHtml ?? `<p>${message}</p>`,
				});
			} catch (e) {
				console.error("[notification] Failed to send email:", e);
			}
		}
	}
}

/**
 * Returns user IDs for all active users with the given role name.
 */
export async function getUserIdsByRole(roleName: string): Promise<string[]> {
	const rows = await db
		.select({ userId: users.userId })
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.where(and(eq(users.isActive, true), eq(roles.roleName, roleName)));

	return rows.map((r) => r.userId);
}
