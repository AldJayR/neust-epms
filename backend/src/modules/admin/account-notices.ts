import { createNotification } from "@/lib/notification.helpers.js";

/** Account notices must reach users who cannot sign in, so request email delivery too. */
export async function notifyAccountChange(recipientId: string, title: string, message: string) {
	try {
		await createNotification({ recipientId, type: "system", title, message, sendEmail: true });
	} catch (error) {
		// The account change has committed; a delivery failure must not report it as failed.
		console.error("[notification] Failed to send account notice:", error);
	}
}
