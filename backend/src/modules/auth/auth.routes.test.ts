import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import {
	setMockUser,
	MOCK_USERS,
	mockSelectChain,
	mockMutationChain,
	mockTransaction,
} from "../../../test/helpers.js";
import { isPasswordCompromised } from "@/lib/password-check.js";
import app from "./auth.routes.js";
import { installApiErrorHandler } from "@/lib/errors.js";

installApiErrorHandler(app);

vi.mock("@/lib/password-check.js", () => ({
	isPasswordCompromised: vi.fn().mockResolvedValue(false),
}));

beforeEach(() => {
	setMockUser(MOCK_USERS.superAdmin);
});

describe("GET /auth/me", () => {
	it("should return the current user profile", async () => {
		const profile = {
			userId: MOCK_USERS.superAdmin.userId,
			firstName: "Admin",
			middleName: null,
			lastName: "User",
			nameSuffix: null,
			academicRank: null,
			email: "admin@neust.edu.ph",
			roleId: 1,
			roleName: "Super Admin",
			campusId: 1,
			campusName: "Main",
			isMainCampus: true,
			departmentId: null,
			departmentName: null,
			isActive: true,
			hasCompletedOnboarding: false,
		};
		vi.mocked(db.select).mockReturnValue(mockSelectChain([profile]) as never);

		const res = await app.request("/auth/me");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.email).toBe("admin@neust.edu.ph");
		expect(body.roleName).toBe("Super Admin");
	});
});

describe("POST /auth/register", () => {
	it("should allow a user to register their own account", async () => {
		const { createClient } = await import("@supabase/supabase-js");
		const mockSupabase = createClient("", "");
		vi.mocked(mockSupabase.auth.admin.createUser).mockResolvedValue({
			data: { user: { id: "new-supabase-id" } as any },
			error: null,
		});

		const facultyRole = { roleId: 4, roleName: "Faculty" };
		const createdUser = {
			userId: "new-supabase-id",
			email: "new@neust.edu.ph",
		};
		const fullProfile = {
			userId: "new-supabase-id",
			firstName: "John",
			lastName: "Doe",
			email: "new@neust.edu.ph",
			roleId: 4,
			roleName: "Faculty",
			campusId: 1,
			campusName: "Main",
			isMainCampus: true,
			departmentId: null,
			isActive: false,
			hasCompletedOnboarding: false,
		};

		// 1. Check existing: empty
		// 2. Check duplicate name: empty
		// 3. Fetch role: faculty
		// 4. Fetch full profile after insert
		vi.mocked(db.select)
			.mockReturnValueOnce(mockSelectChain([]) as never) // Existing check
			.mockReturnValueOnce(mockSelectChain([]) as never) // Duplicate name check
			.mockReturnValueOnce(mockSelectChain([facultyRole]) as never) // Role check
			.mockReturnValueOnce(mockSelectChain([fullProfile]) as never); // Full profile fetch

		vi.mocked(db.insert).mockReturnValue(
			mockMutationChain([createdUser]) as never,
		);

		const res = await app.request("/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				firstName: "John",
				lastName: "Doe",
				email: "new@neust.edu.ph",
				password: "SuperSecurePass2026!",
				campusId: 1,
			}),
		});

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.email).toBe("new@neust.edu.ph");
		expect(body.isActive).toBe(false);
	});

	it("should return 400 if user already exists", async () => {
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([{ userId: "existing" }]) as never,
		);

		const res = await app.request("/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				firstName: "John",
				lastName: "Doe",
				email: "existing@neust.edu.ph",
				password: "SuperSecurePass2026!",
				campusId: 1,
			}),
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("USER_EXISTS");
	});
});

function mockTokenRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "token-id",
		userId: MOCK_USERS.faculty.userId,
		tokenHash: "hash",
		expiresAt: new Date(Date.now() + 60_000),
		usedAt: null,
		...overrides,
	};
}

const validTokenBody = {
	token: "valid-token",
	newPassword: "NewPassword123",
};

describe("POST /auth/reset-password", () => {
	it("should reset the password and revoke sessions with a valid token", async () => {
		const { createClient } = await import("@supabase/supabase-js");
		const mockSupabase = createClient("", "");
		vi.mocked(mockSupabase.auth.admin.updateUserById).mockResolvedValueOnce({
			data: { user: { id: MOCK_USERS.faculty.userId } as never },
			error: null,
		});
		vi.mocked(mockSupabase.auth.admin.signOut).mockResolvedValueOnce({
			error: null,
		} as never);

		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([mockTokenRow()]) as never,
		);
		vi.mocked(db.transaction).mockImplementation(mockTransaction({}) as never);

		const res = await app.request("/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(validTokenBody),
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ success: true });
		expect(mockSupabase.auth.admin.updateUserById).toHaveBeenCalledWith(
			MOCK_USERS.faculty.userId,
			{ password: validTokenBody.newPassword },
		);
		expect(mockSupabase.auth.admin.signOut).toHaveBeenCalledWith(
			MOCK_USERS.faculty.userId,
		);
	});

	it("should reject an unknown or already-used token", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(validTokenBody),
		});

		expect(res.status).toBe(400);
		expect((await res.json()).error.code).toBe("INVALID_RESET_TOKEN");
	});

	it("should reject an expired token", async () => {
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([
				mockTokenRow({ expiresAt: new Date(Date.now() - 60_000) }),
			]) as never,
		);

		const res = await app.request("/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(validTokenBody),
		});

		expect(res.status).toBe(400);
		expect((await res.json()).error.code).toBe("RESET_TOKEN_EXPIRED");
	});

	it("should reject a compromised password without calling Supabase", async () => {
		const { createClient } = await import("@supabase/supabase-js");
		const mockSupabase = createClient("", "");
		vi.mocked(isPasswordCompromised).mockResolvedValueOnce(true);

		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([mockTokenRow()]) as never,
		);

		const res = await app.request("/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(validTokenBody),
		});

		expect(res.status).toBe(400);
		expect((await res.json()).error.code).toBe("COMPROMISED_PASSWORD");
		expect(mockSupabase.auth.admin.updateUserById).not.toHaveBeenCalled();
	});

	it("should reject when the target user has no auth identity", async () => {
		const { createClient } = await import("@supabase/supabase-js");
		const mockSupabase = createClient("", "");
		vi.mocked(mockSupabase.auth.admin.updateUserById).mockResolvedValueOnce({
			data: { user: null },
			error: { message: "User not found" } as never,
		});

		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([mockTokenRow()]) as never,
		);

		const res = await app.request("/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(validTokenBody),
		});

		expect(res.status).toBe(400);
		expect((await res.json()).error.code).toBe("PASSWORD_UPDATE_FAILED");
	});
});
