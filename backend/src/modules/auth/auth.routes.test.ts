import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import {
	setMockUser,
	MOCK_USERS,
	mockSelectChain,
	mockMutationChain,
} from "../../../test/helpers.js";
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
