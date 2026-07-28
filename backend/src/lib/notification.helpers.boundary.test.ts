import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client.js";
import { mockSelectChain } from "../../test/helpers.js";
import { createNotification } from "./notification.helpers.js";

const resendMock = vi.hoisted(() => ({
	send: vi.fn(),
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
	resendMock.send.mockReset();
	resendMock.send.mockResolvedValue({ data: { id: "email-1" }, error: null });
	vi.mocked(db.select).mockReturnValue(
		mockSelectChain([{ email: "recipient@neust.edu.ph" }]) as never,
	);
});

describe("Resend notification boundary", () => {
	it("escapes the default email body before sending it to Resend", async () => {
		vi.mocked(db.insert).mockReturnValue(
			mockInsert([{ notificationId: "notification-1" }]) as never,
		);

		await createNotification({
			recipientId: "user-1",
			type: "system",
			title: "System message",
			message: `<script>alert("xss")</script>`,
			sendEmail: true,
		});

		expect(resendMock.send).toHaveBeenCalledWith({
			from: "test@neust.edu.ph",
			to: "recipient@neust.edu.ph",
			subject: "System message",
			html: '<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>',
		});
	});

	it("keeps the in-app notification successful when Resend rejects", async () => {
		const error = new Error("Resend unavailable");
		resendMock.send.mockRejectedValueOnce(error);
		vi.mocked(db.insert).mockReturnValue(
			mockInsert([{ notificationId: "notification-1" }]) as never,
		);
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await expect(
			createNotification({
				recipientId: "user-1",
				type: "system",
				title: "System message",
				message: "The service is unavailable",
				sendEmail: true,
			}),
		).resolves.toBe(true);

		expect(errorSpy).toHaveBeenCalledWith("[notification] Failed to send email:", error);
		errorSpy.mockRestore();
	});

	it("does not call Resend when the notification insert is a deduplicated no-op", async () => {
		vi.mocked(db.insert).mockReturnValue(mockInsert([]) as never);

		await expect(
			createNotification({
				recipientId: "user-1",
				type: "system",
				title: "Duplicate",
				message: "Already delivered",
				sendEmail: true,
			}),
		).resolves.toBe(false);

		expect(resendMock.send).not.toHaveBeenCalled();
	});
});
