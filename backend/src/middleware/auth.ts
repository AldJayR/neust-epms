import { and, eq, isNull } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { db } from "@/db/client.js";
import { campuses } from "@/db/schema/campuses.js";
import { departments } from "@/db/schema/departments.js";
import { roles } from "@/db/schema/roles.js";
import { users } from "@/db/schema/users.js";
import { ApiError } from "@/lib/errors.js";
import { supabase } from "@/lib/supabase.js";
import type { AuthUser } from "@/lib/types.js";

/** Hono env type that holds the authenticated user */
export interface AuthEnv {
	Variables: {
		user: AuthUser;
	};
}

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
	// Verify identity on every request; application authorization is loaded below.
	const {
		data: { user: supabaseUser },
		error,
	} = await supabase.auth.getUser(token);

	if (error || !supabaseUser) {
		if (
			error &&
			(!error.status || error.status === 429 || error.status >= 500)
		) {
			throw new ApiError(
				503,
				"AUTH_UNAVAILABLE",
				"Authentication is temporarily unavailable",
			);
		}
		throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired token");
	}

	const supabaseUserId = supabaseUser.id;

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
			avatarUrl: users.avatarUrl,
			isActive: users.isActive,
			archivedAt: users.archivedAt,
			hasCompletedOnboarding: users.hasCompletedOnboarding,
		})
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.innerJoin(campuses, eq(users.campusId, campuses.campusId))
		.leftJoin(departments, eq(users.departmentId, departments.departmentId))
		.where(and(eq(users.userId, supabaseUserId), isNull(users.archivedAt)))
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
	if (appUser.archivedAt)
		throw new ApiError(403, "USER_ARCHIVED", "User account is archived");

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
		avatarUrl: appUser.avatarUrl,
		isActive: appUser.isActive,
		hasCompletedOnboarding: appUser.hasCompletedOnboarding,
	};

	c.set("user", userContext);

	await next();
});
