import { eq, isNull, type SQL } from "drizzle-orm";
import { proposals } from "@/db/schema/proposals.js";
import { type AuthUser, ROLE_NAMES } from "@/lib/types.js";

/**
 * Build the role-based scope clause for a user on the proposals table.
 * - Faculty: scoped to department (if main campus + department) or campus.
 * - RET Chair: scoped to department (if main campus + department) or campus.
 * - Director / Super Admin: returns undefined (full access).
 */
function buildRoleScopeClause(user: AuthUser): SQL | undefined {
	if (user.roleName === ROLE_NAMES.FACULTY) {
		return user.isMainCampus && user.departmentId !== null
			? eq(proposals.departmentId, user.departmentId)
			: eq(proposals.campusId, user.campusId);
	}
	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		return user.isMainCampus && user.departmentId !== null
			? eq(proposals.departmentId, user.departmentId)
			: eq(proposals.campusId, user.campusId);
	}
	return undefined;
}

/**
 * Build role-based scoping conditions for the proposals table.
 * Includes `isNull(proposals.archivedAt)` to exclude archived records.
 * Returns an array suitable for use in `where(and(...conditions))`.
 */
export function buildProposalScope(user: AuthUser): SQL[] {
	const conditions: SQL[] = [isNull(proposals.archivedAt)];
	const clause = buildRoleScopeClause(user);
	if (clause) conditions.push(clause);
	return conditions;
}

/**
 * Build a single scope clause (not array) for use in OR/AND compositions.
 * Returns the role-based filtering clause only, without archivedAt.
 * Returns undefined for Director / Super Admin (full access).
 */
export function buildProposalScopeClause(user: AuthUser): SQL | undefined {
	return buildRoleScopeClause(user);
}

/**
 * Apply the same campus/department rules to a proposal row already loaded by
 * an endpoint that also needs to validate a child resource relationship.
 */
export function isProposalInScope(
	user: AuthUser,
	proposal: { campusId: number; departmentId: number },
): boolean {
	if (
		user.roleName !== ROLE_NAMES.FACULTY &&
		user.roleName !== ROLE_NAMES.RET_CHAIR
	) {
		return true;
	}

	if (user.isMainCampus && user.departmentId !== null) {
		return proposal.departmentId === user.departmentId;
	}

	return proposal.campusId === user.campusId;
}
