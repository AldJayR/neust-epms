import { describe, expect, it, vi } from "vitest";
import app from "@/app.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { seedAuthUser, seedOrganization } from "./fixtures.js";

const supabaseMock = vi.hoisted(() => ({
	auth: {
		getUser: vi.fn(),
	},
	admin: {
		createUser: vi.fn(),
		deleteUser: vi.fn(),
		getUserById: vi.fn(),
	},
	storage: {
		from: vi.fn(),
	},
}));

vi.mock("@supabase/supabase-js", () => ({
	createClient: vi.fn(() => supabaseMock),
}));

describe("authenticated HTTP workflow", () => {
	it("validates a token and returns the real application profile", async () => {
		const organization = await seedOrganization("http-auth");
		const user = await seedAuthUser(organization, {
			slug: "http-auth-faculty",
			roleName: ROLE_NAMES.FACULTY,
		});
		supabaseMock.auth.getUser.mockResolvedValueOnce({
			data: { user: { id: user.userId } },
			error: null,
		});

		const response = await app.request("/api/v1/auth/me", {
			headers: { Authorization: "Bearer integration-token" },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			userId: user.userId,
			email: user.email,
			roleName: ROLE_NAMES.FACULTY,
			campusId: user.campusId,
		});
		expect(supabaseMock.auth.getUser).toHaveBeenCalledWith("integration-token");
	});

	it("returns the API's structured unauthorized response for an invalid token", async () => {
		supabaseMock.auth.getUser.mockResolvedValueOnce({
			data: { user: null },
			error: { message: "Invalid token" },
		});

		const response = await app.request("/api/v1/auth/me", {
			headers: { Authorization: "Bearer invalid-token" },
		});

		expect(response.status).toBe(401);
		expect((await response.json()).error).toMatchObject({
			code: "INVALID_TOKEN",
			message: "Invalid or expired token",
		});
	});
});
