import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../../db/client.js";
import {
	setMockUser,
	MOCK_USERS,
	mockSelectChain,
	mockMutationChain,
} from "../../../test/helpers.js";
import app from "./auth.routes.js";

vi.mock("../lib/password-check.js", () => ({
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
			roleName: "Super Admin",
			campusName: "Main",
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

describe("POST /auth/users", () => {
	it("should allow Super Admin to provision a user", async () => {
		const created = { userId: "new-user-id" };
		const profile = {
			userId: "new-user-id",
			firstName: "New",
			middleName: null,
			lastName: "Faculty",
			nameSuffix: null,
			academicRank: "Instructor I",
			email: "new@neust.edu.ph",
			roleName: "Faculty",
			campusName: "Main",
			departmentName: "CICT",
			isActive: true,
			hasCompletedOnboarding: false,
		};

		vi.mocked(db.insert).mockReturnValue(mockMutationChain([created]) as never);
		vi.mocked(db.select).mockReturnValue(mockSelectChain([profile]) as never);

		const res = await app.request("/auth/users", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				firstName: "New",
				lastName: "Faculty",
				email: "new@neust.edu.ph",
				roleId: 4,
				campusId: 1,
				departmentId: 1,
				supabaseUserId: "bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb",
			}),
		});
		expect(res.status).toBe(201);
	});

	it("should reject Faculty from provisioning users", async () => {
		setMockUser(MOCK_USERS.faculty);
		const res = await app.request("/auth/users", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				firstName: "Fail",
				lastName: "User",
				email: "fail@neust.edu.ph",
				roleId: 4,
				campusId: 1,
				supabaseUserId: "cccccccc-1111-4111-8111-cccccccccccc",
			}),
		});
		expect(res.status).toBe(403);
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
			roleName: "Faculty",
			campusName: "Main",
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
