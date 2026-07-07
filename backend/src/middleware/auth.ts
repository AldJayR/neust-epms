import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { db } from "../db/client.js";
import { campuses } from "../db/schema/campuses.js";
import { departments } from "../db/schema/departments.js";
import { roles } from "../db/schema/roles.js";
import { users } from "../db/schema/users.js";
import { env } from "../env.js";
import { authUserCache, cacheEnabled, tokenCache } from "../lib/cache.js";
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
		throw new ApiError(
			401,
			"MISSING_TOKEN",
			"Authorization header is required",
		);
	}

	const token = authHeader.slice(7);
	const tokenHash = createHash("sha256").update(token).digest("hex");
	const tokenCacheKey = `auth:token:${tokenHash}`;

	let supabaseUserId: string | null = null;

	if (cacheEnabled) {
		// 1. Try to resolve user ID from token cache (bypasses Supabase HTTPS call)
		supabaseUserId = tokenCache.get(tokenCacheKey) ?? null;

		if (supabaseUserId) {
			// 2. Try to resolve user profile from authUserCache (bypasses PostgreSQL DB query)
			const cachedUser = authUserCache.get(`auth:user:${supabaseUserId}`);
			if (cachedUser) {
				c.set("user", cachedUser);
				await next();
				return;
			}
		}
	}

	// If token mapping is not cached, validate it with Supabase
	if (!supabaseUserId) {
		const {
			data: { user: supabaseUser },
			error,
		} = await supabase.auth.getUser(token);

		if (error || !supabaseUser) {
			throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired token");
		}

		supabaseUserId = supabaseUser.id;
		if (cacheEnabled) {
			tokenCache.set(tokenCacheKey, supabaseUserId);
		}
	}

	// Fetch the application user record with role
	const [appUser] = await db
		.select({
			userId: users.userId,
			email: users.email,
			roleId: users.roleId,
			roleName: roles.roleName,
			campusId: users.campusId,
			campusName: campuses.campusName,
			isMainCampus: campuses.isMainCampus,
			departmentId: users.departmentId,
			departmentName: departments.departmentName,
			firstName: users.firstName,
			middleName: users.middleName,
			lastName: users.lastName,
			nameSuffix: users.nameSuffix,
			academicRank: users.academicRank,
			isActive: users.isActive,
			hasCompletedOnboarding: users.hasCompletedOnboarding,
		})
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.innerJoin(campuses, eq(users.campusId, campuses.campusId))
		.leftJoin(departments, eq(users.departmentId, departments.departmentId))
		.where(eq(users.userId, supabaseUserId))
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

	const userContext: AuthUser = {
		userId: appUser.userId,
		email: appUser.email,
		roleId: appUser.roleId,
		roleName: appUser.roleName,
		campusId: appUser.campusId,
		campusName: appUser.campusName,
		isMainCampus: appUser.isMainCampus,
		departmentId: appUser.departmentId,
		departmentName: appUser.departmentName,
		firstName: appUser.firstName,
		middleName: appUser.middleName,
		lastName: appUser.lastName,
		nameSuffix: appUser.nameSuffix,
		academicRank: appUser.academicRank,
		isActive: appUser.isActive,
		hasCompletedOnboarding: appUser.hasCompletedOnboarding,
	};

	if (cacheEnabled) {
		authUserCache.set(`auth:user:${supabaseUserId}`, userContext);
	}

	c.set("user", userContext);

	await next();
});
