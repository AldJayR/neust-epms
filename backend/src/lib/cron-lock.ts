import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { cronLocks } from "@/db/schema/cron-locks.js";

const LOCK_TTL_MS = 15 * 60 * 1000;

/**
 * Run one scheduled job at a time across all backend processes.
 * An expired lease can be reclaimed after a process crash.
 */
export async function withCronLock<T>(
	jobName: string,
	task: () => Promise<T>,
): Promise<T | undefined> {
	const lockToken = randomUUID();
	const lockedUntil = new Date(Date.now() + LOCK_TTL_MS);

	const acquired = await db.transaction(async (tx) => {
		const result = await tx.execute(sql`
			INSERT INTO cron_locks (job_name, lock_token, locked_until)
			VALUES (${jobName}, ${lockToken}, ${lockedUntil})
			ON CONFLICT (job_name) DO UPDATE
			SET lock_token = ${lockToken}, locked_until = ${lockedUntil}
			WHERE cron_locks.locked_until <= CURRENT_TIMESTAMP
			RETURNING job_name
		`);

		return Array.isArray(result) && result.length > 0;
	});

	if (!acquired) {
		console.log(
			`[CRON] Skipping ${jobName}; another instance holds the lease.`,
		);
		return undefined;
	}

	const renewLease = async () => {
		try {
			await db
				.update(cronLocks)
				.set({ lockedUntil: new Date(Date.now() + LOCK_TTL_MS) })
				.where(
					and(
						eq(cronLocks.jobName, jobName),
						eq(cronLocks.lockToken, lockToken),
					),
				);
		} catch (error) {
			console.error(`[CRON] Failed to renew ${jobName} lease:`, error);
		}
	};
	const renewalTimer = setInterval(() => {
		void renewLease();
	}, LOCK_TTL_MS / 3);

	try {
		return await task();
	} finally {
		clearInterval(renewalTimer);
		try {
			await db
				.delete(cronLocks)
				.where(
					and(
						eq(cronLocks.jobName, jobName),
						eq(cronLocks.lockToken, lockToken),
					),
				);
		} catch (error) {
			console.error(`[CRON] Failed to release ${jobName} lease:`, error);
		}
	}
}
