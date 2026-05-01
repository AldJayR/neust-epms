/**
 * Unit tests for the auth middleware.
 *
 * Tests edge cases: missing Authorization header, invalid token,
 * and Supabase returning an error for the token.
 *
 * We mount the middleware in a minimal Hono app WITH the same
 * onError handler as the real app so that thrown ApiErrors
 * are serialized as JSON (not plain text).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { ApiError, createErrorResponse } from "../lib/errors.js";
import { mockSelectChain } from "../../test/helpers.js";
import type { AuthEnv } from "./auth.js";

describe("authMiddleware", () => {
  let app: Hono<AuthEnv>;

  beforeEach(async () => {
    vi.resetModules();
    vi.unmock("./auth.js");
    vi.unmock("../middleware/auth.js");

    const { authMiddleware } = await import("./auth.js");

    app = new Hono<AuthEnv>();

    // Mirror the real app's error handler so ApiErrors return JSON
    app.onError((err, c) => {
      if (err instanceof ApiError || err.name === "ApiError") {
        return c.json(createErrorResponse(err as ApiError), (err as ApiError).status);
      }
      return c.json(
        { error: { code: "INTERNAL_ERROR", message: err.message } },
        500,
      );
    });

    app.use("*", authMiddleware);
    app.get("/test", (c) => c.json({ userId: c.get("user").userId }));
  });

  it("should return 401 when no Authorization header is present", async () => {
    const res = await app.request("/test");

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_TOKEN");
  });

  it("should return 401 when Authorization header does not start with Bearer", async () => {
    const res = await app.request("/test", {
      headers: { Authorization: "Basic abc123" },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_TOKEN");
  });

  it("should return 401 when Supabase returns an error for the token", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const mockSupabase = createClient("" , "");
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid token" } as any,
    });

    const res = await app.request("/test", {
      headers: { Authorization: "Bearer invalid-token" },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_TOKEN");
  });

  it("should return 403 when user is inactive", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const { db } = await import("../db/client.js");

    const mockSupabase = createClient("" , "");
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "inactive-user-id" } as any },
      error: null,
    });

    vi.mocked(db.select).mockReturnValue(mockSelectChain([{ 
      userId: "inactive-user-id", 
      isActive: false,
      roleId: 4,
      roleName: "Faculty"
    }]) as any);

    const res = await app.request("/test", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("USER_INACTIVE");
  });
});
