import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client.js";
import { mockSelectChain } from "../../test/helpers.js";
import { createNotification } from "./notification.helpers.js";

const resendMock = vi.hoisted(() => ({
	send: vi.fn().mockResolvedValue({}),
}));

vi.mock("resend", () => ({
	Resend: class {
		emails = { send: resendMock.send };
	},
}));

function mockInsert(result: unknown[]) {
	const chain: Record<string, unknown> = {};
	chain.values = vi.fn(() => chain);
	chain.onConflictDoNothing = vi.fn(() => chain);
	chain.returning = vi.fn(() => chain);
	chain.then = (resolve: (value: unknown[]) => void) => resolve(result);
	return chain;
}

beforeEach(() => {
	resendMock.send.mockClear();
	vi.mocked(db.select).mockReturnValue(
		mockSelectChain([{ email: "recipient@neust.edu.ph" }]) as never,
	);
});

describe("createNotification", () => {
	it("does not send a duplicate email when a dedupe key already exists", async () => {
		vi.mocked(db.insert)
			.mockReturnValueOnce(mockInsert([{ notificationId: "notification-1" }]) as never)
			.mockReturnValueOnce(mockInsert([]) as never);

		const opts = {
			recipientId: "user-1",
			type: "report_overdue" as const,
			title: "Report Overdue",
			message: "A report is overdue",
			sendEmail: true,
			dedupeKey: "report-overdue:milestone-1:user-1",
		};

		await createNotification(opts);
		await createNotification(opts);

		expect(resendMock.send).toHaveBeenCalledOnce();
	});
});
