import { beforeEach, describe, expect, it, vi } from "vitest";
import cron from "node-cron";

const cronLockMock = vi.hoisted(() => vi.fn());

vi.mock("node-cron", () => ({
	default: { schedule: vi.fn() },
}));
vi.mock("@/lib/cron-lock.js", () => ({
	withCronLock: cronLockMock,
}));

import { startMoaExpirationCron } from "./moa-expiration.js";
import { startPrivacyRetentionCron } from "./privacy-retention.js";
import { startReportOverdueCron } from "./report-overdue.js";

beforeEach(() => {
	vi.mocked(cron.schedule).mockReset();
	cronLockMock.mockReset();
	cronLockMock.mockResolvedValue(undefined);
});

describe("cron external boundary", () => {
	it("registers each scheduled job with its documented cadence", () => {
		startMoaExpirationCron();
		startReportOverdueCron();
		startPrivacyRetentionCron();

		expect(vi.mocked(cron.schedule).mock.calls.map(([expression]) => expression)).toEqual([
			"0 1 * * *",
			"0 2 * * *",
			"0 3 * * 0",
		]);
	});

	it("routes scheduled executions through distinct distributed lock names", async () => {
		startMoaExpirationCron();
		startReportOverdueCron();
		startPrivacyRetentionCron();

		for (const [, callback] of vi.mocked(cron.schedule).mock.calls) {
			callback(new Date());
		}
		await Promise.resolve();

		expect(cronLockMock).toHaveBeenNthCalledWith(
			1,
			"moa-expiration",
			expect.any(Function),
		);
		expect(cronLockMock).toHaveBeenNthCalledWith(
			2,
			"report-overdue",
			expect.any(Function),
		);
		expect(cronLockMock).toHaveBeenNthCalledWith(
			3,
			"privacy-retention",
			expect.any(Function),
		);
	});
});
