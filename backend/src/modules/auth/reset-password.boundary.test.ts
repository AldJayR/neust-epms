import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client.js";
import {
	mockSelectChain,
	mockTransaction,
	MOCK_USERS,
} from "../../../test/helpers.js";
import { resetPasswordWithToken } from "./auth.service.js";

vi.mock("@/lib/password-check.js", () => ({
	isPasswordCompromised: vi.fn().mockResolvedValue(false),
}));

const tokenRow = {
	id: "token-id",
	userId: MOCK_USERS.faculty.userId,
	tokenHash: "hash",
	expiresAt: new Date(Date.now() + 60_000),
	usedAt: null,
};

describe("Supabase password reset boundary", () => {
	beforeEach(() => {
		vi.mocked(db.select).mockReset();
		vi.mocked(db.transaction).mockReset();
	});

	it("updates the password and revokes sessions through the admin API", async () => {
		const { createClient } = await import("@supabase/supabase-js");
		const mockSupabase = createClient("", "");
		vi.mocked(mockSupabase.auth.admin.updateUserById).mockResolvedValue({
			data: { user: { id: MOCK_USERS.faculty.userId } as never },
			error: null,
		});
		vi.mocked(mockSupabase.auth.admin.signOut).mockResolvedValue({
			error: null,
		} as never);
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([tokenRow]) as never,
		);
		vi.mocked(db.transaction).mockImplementation(mockTransaction({}) as never);

		const result = await resetPasswordWithToken(
			"raw-token",
			"NewPassword123",
			"127.0.0.1",
		);

		expect(result).toEqual({ success: true });
		expect(mockSupabase.auth.admin.updateUserById).toHaveBeenCalledWith(
			MOCK_USERS.faculty.userId,
			{ password: "NewPassword123" },
		);
		expect(mockSupabase.auth.admin.signOut).toHaveBeenCalledWith(
			MOCK_USERS.faculty.userId,
		);
	});

	it("throws PASSWORD_UPDATE_FAILED when the target has no auth identity", async () => {
		const { createClient } = await import("@supabase/supabase-js");
		const mockSupabase = createClient("", "");
		vi.mocked(mockSupabase.auth.admin.updateUserById).mockResolvedValue({
			data: { user: null },
			error: { message: "User not found" } as never,
		});
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([tokenRow]) as never,
		);

		await expect(
			resetPasswordWithToken("raw-token", "NewPassword123", "127.0.0.1"),
		).rejects.toMatchObject({
			status: 400,
			code: "PASSWORD_UPDATE_FAILED",
		});
	});
});