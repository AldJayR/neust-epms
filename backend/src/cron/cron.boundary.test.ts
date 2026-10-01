import { beforeEach, describe, expect, it, vi } from "vitest";
import cron from "node-cron";
import { PgDialect } from "drizzle-orm/pg-core";
import { db } from "@/db/client.js";
import {
	createNotification,
	getUserIdsByRole,
} from "@/lib/notification.helpers.js";
import { mockMutationChain, mockSelectChain } from "../../test/helpers.js";

const cronLockMock = vi.hoisted(() => vi.fn());

vi.mock("node-cron", () => ({
	default: { schedule: vi.fn() },
}));
vi.mock("@/lib/cron-lock.js", () => ({
	withCronLock: cronLockMock,
}));
vi.mock("@/lib/notification.helpers.js", () => ({
	createNotification: vi.fn(),
	getUserIdsByRole: vi.fn(),
}));

import { runMoaExpiration, startMoaExpirationCron } from "./moa-expiration.js";
import { startPrivacyRetentionCron } from "./privacy-retention.js";
import { startReportOverdueCron } from "./report-overdue.js";

beforeEach(() => {
	vi.mocked(cron.schedule).mockReset();
	cronLockMock.mockReset();
	cronLockMock.mockResolvedValue(undefined);
	vi.mocked(db.select).mockReset();
	vi.mocked(db.update).mockReset();
	vi.mocked(createNotification).mockReset();
	vi.mocked(getUserIdsByRole).mockReset();
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

	it("processes old MOA expirations and expires linked overdue projects", async () => {
		const oldMoa = {
			moaId: "moa-1",
			partnerName: "Community Partner",
			validUntil: new Date("2020-01-01T00:00:00.000Z"),
		};
		const selectChains = [
			mockSelectChain([oldMoa]),
			mockSelectChain([]),
			mockSelectChain([{ userId: "director-1" }]),
		];
		let selectIndex = 0;
		let expiredMoaCondition: unknown;
		vi.mocked(db.select).mockImplementation(() => {
			const chain = selectChains[selectIndex++];
			if (selectIndex === 1) {
				chain.where = vi.fn((condition: unknown) => {
					expiredMoaCondition = condition;
					return chain;
				});
			}
			return chain as never;
		});
		vi.mocked(getUserIdsByRole).mockResolvedValue(["director-1"]);
		vi.mocked(createNotification).mockResolvedValue(false as never);

		const updateChain = mockMutationChain([{ projectId: "project-1" }]);
		let projectCondition: unknown;
		updateChain.where = vi.fn((condition: unknown) => {
			projectCondition = condition;
			return updateChain;
		});
		vi.mocked(db.update).mockReturnValue(updateChain as never);

		await runMoaExpiration();

		const expiredQuery = new PgDialect().sqlToQuery(expiredMoaCondition as never);
		const projectQuery = new PgDialect().sqlToQuery(projectCondition as never);
		expect(expiredQuery.params).toHaveLength(1);
		expect(projectQuery.params).toContain("Overdue");
		expect(projectQuery.params).toContain("Ongoing");
		expect(db.update).toHaveBeenCalledOnce();
	});
});
