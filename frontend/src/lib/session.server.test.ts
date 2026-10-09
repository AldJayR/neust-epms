import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	session: {
		data: {} as Record<string, unknown>,
		clear: vi.fn(),
		update: vi.fn(),
	},
	refresh: vi.fn(),
}));
vi.mock("@tanstack/react-start/server", () => ({
	useSession: vi.fn(() => mocks.session),
}));
vi.mock("@supabase/supabase-js", () => ({
	createClient: vi.fn(() => ({ auth: { refreshSession: mocks.refresh } })),
}));

import {
	authorizeSessionUser,
	getValidAccessToken,
	isRecoverySession,
	RECOVERY_SESSION_TTL_MS,
	SessionExpiredError,
} from "./session.server";

beforeEach(() => {
	vi.clearAllMocks();
	mocks.session.data = {};
});

describe("session purpose and refresh boundaries", () => {
	it("requires a fresh recovery identity without an application profile", () => {
		const recovery = {
			purpose: "recovery" as const,
			recoveryUserId: "user-1",
			recoveryVerifiedAt: Date.now(),
			accessToken: "access",
			refreshToken: "refresh",
		};
		expect(isRecoverySession(recovery)).toBe(true);
		expect(isRecoverySession({ ...recovery, purpose: "app" })).toBe(false);
		expect(isRecoverySession({ ...recovery, userId: "other-user" })).toBe(
			false,
		);
		expect(
			isRecoverySession({
				...recovery,
				recoveryVerifiedAt: Date.now() - RECOVERY_SESSION_TTL_MS - 1,
			}),
		).toBe(false);
	});
	it("cannot authorize application calls using a recovery session", async () => {
		mocks.session.data = {
			purpose: "recovery",
			accessToken: "access",
			refreshToken: "refresh",
		};
		await expect(getValidAccessToken()).rejects.toThrow("Password recovery");
		await expect(authorizeSessionUser("Faculty")).rejects.toThrow(
			"Password recovery",
		);
		expect(mocks.refresh).not.toHaveBeenCalled();
	});
	it("preserves a session when the auth provider is temporarily unavailable", async () => {
		mocks.session.data = { purpose: "app", refreshToken: "refresh" };
		mocks.refresh.mockResolvedValue({
			data: { session: null },
			error: { status: 503 },
		});
		await expect(getValidAccessToken()).rejects.toThrow(
			"temporarily unavailable",
		);
		expect(mocks.session.clear).not.toHaveBeenCalled();
	});
	it("clears a session when its refresh credential is invalid", async () => {
		mocks.session.data = { purpose: "app", refreshToken: "refresh" };
		mocks.refresh.mockResolvedValue({
			data: { session: null },
			error: { status: 400 },
		});
		await expect(getValidAccessToken()).rejects.toBeInstanceOf(
			SessionExpiredError,
		);
		expect(mocks.session.clear).toHaveBeenCalledOnce();
	});
});
