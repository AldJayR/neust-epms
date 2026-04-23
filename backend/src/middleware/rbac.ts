import { createMiddleware } from "hono/factory";
import { ApiError } from "../lib/errors.js";
import type { AuthEnv } from "./auth.js";

/**
 * Creates an RBAC middleware that restricts access to specific role names.
 * Must be used AFTER authMiddleware so `c.var.user` is available.
 *
 * @example
 * ```ts
 * app.get("/admin", authMiddleware, requireRole("Super Admin", "Director"), handler)
 * ```
 */
export function requireRole(...allowedRoles: string[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const user = c.get("user");

    if (!allowedRoles.includes(user.roleName)) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        `This action requires one of: ${allowedRoles.join(", ")}`,
      );
    }

    await next();
  });
}
