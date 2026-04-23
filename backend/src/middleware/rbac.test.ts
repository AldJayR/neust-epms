/**
 * Unit tests for the RBAC middleware.
 *
 * We test the requireRole function by creating a minimal Hono app,
 * attaching a mock user to context, and asserting the middleware
 * either allows or blocks the request.
 */
import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requireRole } from "./rbac.js";
import { ApiError, createErrorResponse } from "../lib/errors.js";
import type { AuthEnv } from "./auth.js";

/**
 * Creates a minimal Hono test app with the given allowed roles
 * and a mock user pre-injected into the context (bypassing auth).
 * Includes an onError handler so thrown ApiErrors return JSON.
 */
function createTestApp(allowedRoles: string[], userRole: string) {
  const app = new Hono<AuthEnv>();

  // Mirror the real app's error handler
  app.onError((err, c) => {
    if (err instanceof ApiError || err.name === "ApiError") {
      return c.json(createErrorResponse(err as ApiError), (err as ApiError).status);
    }
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: err.message } },
      500,
    );
  });

  // Simulate what authMiddleware does — inject user into context
  app.use("*", async (c, next) => {
    c.set("user", {
      userId: "test-user-id",
      email: "test@neust.edu.ph",
      roleId: 1,
      roleName: userRole,
      campusId: 1,
      departmentId: null,
    });
    await next();
  });

  // Apply the RBAC middleware
  app.get("/protected", requireRole(...allowedRoles), (c) =>
    c.json({ message: "Access granted" }),
  );

  return app;
}

describe("requireRole middleware", () => {
  it("should allow access when the user has an allowed role", async () => {
    const app = createTestApp(["Super Admin", "Director"], "Director");
    const res = await app.request("/protected");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Access granted");
  });

  it("should return 403 when the user role is not in the allowed list", async () => {
    const app = createTestApp(["Super Admin"], "Faculty");
    const res = await app.request("/protected");

    expect(res.status).toBe(403);
  });

  it("should allow access when multiple roles are permitted and user matches one", async () => {
    const app = createTestApp(
      ["Super Admin", "Director", "RET Chair"],
      "RET Chair",
    );
    const res = await app.request("/protected");

    expect(res.status).toBe(200);
  });

  it("should reject even Director if only Super Admin is allowed", async () => {
    const app = createTestApp(["Super Admin"], "Director");
    const res = await app.request("/protected");

    expect(res.status).toBe(403);
  });

  it("should include allowed roles in the error message", async () => {
    const app = createTestApp(["Super Admin", "Director"], "Faculty");
    const res = await app.request("/protected");
    const body = await res.json();

    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toContain("Super Admin");
    expect(body.error.message).toContain("Director");
  });
});
