import { createMiddleware } from "hono/factory";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { env } from "../env.js";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { roles } from "../db/schema/roles.js";
import { ApiError } from "../lib/errors.js";
import type { AuthUser } from "../lib/types.js";

/** Hono env type that holds the authenticated user */
export interface AuthEnv {
  Variables: {
    user: AuthUser;
  };
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * JWT authentication middleware.
 * Extracts the Supabase JWT from the Authorization header,
 * validates it, and attaches the user context to `c.var.user`.
 */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError(401, "MISSING_TOKEN", "Authorization header is required");
  }

  const token = authHeader.slice(7);

  const {
    data: { user: supabaseUser },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !supabaseUser) {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired token");
  }

  // Fetch the application user record with role
  const [appUser] = await db
    .select({
      userId: users.userId,
      email: users.email,
      roleId: users.roleId,
      roleName: roles.roleName,
      campusId: users.campusId,
      departmentId: users.departmentId,
      isActive: users.isActive,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .where(eq(users.userId, supabaseUser.id))
    .limit(1);

  if (!appUser) {
    throw new ApiError(
      401,
      "USER_NOT_FOUND",
      "Authenticated user has no application profile",
    );
  }

  if (!appUser.isActive) {
    throw new ApiError(403, "USER_INACTIVE", "User account is deactivated");
  }

  c.set("user", {
    userId: appUser.userId,
    email: appUser.email,
    roleId: appUser.roleId,
    roleName: appUser.roleName,
    campusId: appUser.campusId,
    departmentId: appUser.departmentId,
  });

  await next();
});
