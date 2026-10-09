import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	session: {
		data: {} as Record<string, unknown>,
		clear: vi.fn(),
		update: vi.fn(),
	},
	verifyOtp: vi.fn(),
	updateUser: vi.fn(),
}));
vi.mock("@tanstack/react-start", async () => {
	const { createServerFnMock } = await import(
		"../../../test/server-function-mock"
	);
	return { createServerFn: createServerFnMock };
});
vi.mock("@/lib/session.server", async () => {
	const actual = await vi.importActual<typeof import("@/lib/session.server")>(
		"@/lib/session.server",
	);
	return { ...actual, getAppSession: vi.fn(() => mocks.session) };
});
vi.mock("@supabase/supabase-js", () => ({
	createClient: vi.fn(() => ({
		auth: { verifyOtp: mocks.verifyOtp, updateUser: mocks.updateUser },
	})),
}));

import { setNewPasswordFn, verifyResetCodeFn } from "./functions";

beforeEach(() => {
	vi.clearAllMocks();
	mocks.session.data = {};
	mocks.session.clear.mockImplementation(async () => {
		mocks.session.data = {};
	});
	mocks.session.update.mockImplementation(async (value) => {
		Object.assign(mocks.session.data, value);
	});
});

describe("password recovery server functions", () => {
	it("refuses password reset from an ordinary logged-in session", async () => {
		mocks.session.data = {
			purpose: "app",
			accessToken: "access",
			refreshToken: "refresh",
			userId: "user-a",
		};
		const result = await setNewPasswordFn({
			data: { password: "NewPassword123" },
		});
		expect(result.error).toBe(true);
		expect(mocks.updateUser).not.toHaveBeenCalled();
	});
	it("replaces an existing application identity with the verified recovery identity", async () => {
		mocks.session.data = {
			purpose: "app",
			userId: "user-a",
			user: { userId: "user-a" },
			createdAt: Date.now(),
		};
		mocks.verifyOtp.mockResolvedValue({
			data: {
				user: { id: "user-b", email: "b@example.com" },
				session: {
					user: { id: "user-b" },
					access_token: "b-access",
					refresh_token: "b-refresh",
				},
			},
			error: null,
		});
		expect(
			await verifyResetCodeFn({
				data: { email: "b@example.com", code: "123456" },
			}),
		).toEqual({ error: false });
		expect(mocks.session.data).toMatchObject({
			purpose: "recovery",
			recoveryUserId: "user-b",
			accessToken: "b-access",
		});
		expect(mocks.session.data.user).toBeUndefined();
		expect(mocks.session.data.userId).toBeUndefined();
		expect(mocks.session.data.createdAt).toBeUndefined();
	});
});
