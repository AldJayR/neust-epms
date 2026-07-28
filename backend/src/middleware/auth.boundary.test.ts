import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { db } from "@/db/client.js";
import { ApiError, createErrorResponse } from "@/lib/errors.js";
import { mockSelectChain, MOCK_USERS } from "../../test/helpers.js";
import type { AuthEnv } from "./auth.js";

vi.unmock("./auth.js");
vi.unmock("@/middleware/auth.js");

describe("Supabase Auth boundary", () => {
	let app: Hono<AuthEnv>;

	beforeEach(async () => {
		vi.resetModules();
		const { authMiddleware } = await import("./auth.js");
		app = new Hono<AuthEnv>();
		app.onError((error, c) => {
			if (error instanceof ApiError || error.name === "ApiError") {
				return c.json(
					createErrorResponse(error as ApiError),
					(error as ApiError).status,
				);
			}
			return c.json({ error: { code: "INTERNAL_ERROR" } }, 500);
		});
		app.use("*", authMiddleware);
		app.get("/test", (c) => c.json({ userId: c.get("user").userId }));
	});

	it("validates the bearer token with Supabase and loads the application profile", async () => {
		const { createClient } = await import("@supabase/supabase-js");
		const mockSupabase = createClient("", "");
		vi.mocked(mockSupabase.auth.getUser).mockResolvedValueOnce({
			data: { user: { id: MOCK_USERS.faculty.userId } as never },
			error: null,
		});
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([MOCK_USERS.faculty]) as never,
		);

		const response = await app.request("/test", {
			headers: { Authorization: "Bearer boundary-token" },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ userId: MOCK_USERS.faculty.userId });
		expect(mockSupabase.auth.getUser).toHaveBeenCalledWith("boundary-token");
	});

	it("rejects a valid Supabase user that has no application profile", async () => {
		const { createClient } = await import("@supabase/supabase-js");
		const mockSupabase = createClient("", "");
		vi.mocked(mockSupabase.auth.getUser).mockResolvedValueOnce({
			data: { user: { id: "supabase-only-user" } as never },
			error: null,
		});
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const response = await app.request("/test", {
			headers: { Authorization: "Bearer valid-token" },
		});

		expect(response.status).toBe(401);
		expect((await response.json()).error.code).toBe("USER_NOT_FOUND");
	});
});
