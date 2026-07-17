import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client.js";
import { mockMutationChain } from "../../test/helpers.js";
import { withCronLock } from "./cron-lock.js";

const deleteChain = {
	where: vi.fn().mockResolvedValue([]),
};

beforeEach(() => {
	vi.mocked(db.transaction).mockImplementation(
		async (callback) => callback(db as never) as never,
	);
	vi.mocked(db.delete).mockReturnValue(deleteChain as never);
	vi.mocked(db.execute).mockReset();
	deleteChain.where.mockClear();
});

describe("withCronLock", () => {
	it("runs the job and releases its own lease when acquired", async () => {
		vi.mocked(db.execute).mockResolvedValueOnce([{ jobName: "report-overdue" }] as never);
		const job = vi.fn().mockResolvedValue("complete");

		const result = await withCronLock("report-overdue", job);

		expect(result).toBe("complete");
		expect(job).toHaveBeenCalledOnce();
		expect(deleteChain.where).toHaveBeenCalledOnce();
	});

	it("skips the job while another lease is active", async () => {
		vi.mocked(db.execute).mockResolvedValueOnce([] as never);
		const job = vi.fn();

		const result = await withCronLock("report-overdue", job);

		expect(result).toBeUndefined();
		expect(job).not.toHaveBeenCalled();
		expect(deleteChain.where).not.toHaveBeenCalled();
	});

	it("reclaims an expired lease", async () => {
		vi.mocked(db.execute).mockResolvedValueOnce([{ jobName: "report-overdue" }] as never);
		const job = vi.fn().mockResolvedValue(undefined);

		await withCronLock("report-overdue", job);

		expect(job).toHaveBeenCalledOnce();
	});

	it("renews a lease while a long-running job is active", async () => {
		vi.useFakeTimers();
		vi.mocked(db.execute).mockResolvedValueOnce([{ jobName: "report-overdue" }] as never);
		vi.mocked(db.update).mockReturnValue(mockMutationChain([]) as never);

		let finish!: () => void;
		const completion = new Promise<void>((resolve) => {
			finish = resolve;
		});
		const running = withCronLock("report-overdue", () => completion);

		await Promise.resolve();
		await Promise.resolve();
		await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

		expect(db.update).toHaveBeenCalledOnce();

		finish();
		await running;
		vi.useRealTimers();
	});
});
