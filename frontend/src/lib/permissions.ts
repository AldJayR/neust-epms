export type RoleName = "Super Admin" | "Director" | "RET Chair" | "Faculty";

const ROLES = {
	SUPER_ADMIN: "Super Admin" as RoleName,
	DIRECTOR: "Director" as RoleName,
	RET_CHAIR: "RET Chair" as RoleName,
} as const;

function hasRole(
	user: { roleName?: string } | null | undefined,
	...roles: RoleName[]
): boolean {
	if (!user) return false;
	return roles.includes(user.roleName as RoleName);
}

export function isSuperAdmin(
	user: { roleName?: string } | null | undefined,
): boolean {
	return hasRole(user, ROLES.SUPER_ADMIN);
}

export function isDirector(
	user: { roleName?: string } | null | undefined,
): boolean {
	return hasRole(user, ROLES.DIRECTOR);
}

export function isRETChair(
	user: { roleName?: string } | null | undefined,
): boolean {
	return hasRole(user, ROLES.RET_CHAIR);
}

export function isAdminOrDirector(
	user: { roleName?: string } | null | undefined,
): boolean {
	return hasRole(user, ROLES.SUPER_ADMIN, ROLES.DIRECTOR);
}

/** Returns true if the user does NOT have one of the required roles (use for route guards) */
export function requireRole(
	user: { roleName?: string } | null | undefined,
	...roles: RoleName[]
): boolean {
	return !hasRole(user, ...roles);
}
