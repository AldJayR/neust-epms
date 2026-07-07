// ── Shared auth types (safe to import on client and server) ──

/** The user profile stored in session and returned by getCurrentUser */
export interface AuthUser {
	userId: string;
	email: string;
	roleId: number;
	roleName: string;
	campusId: number;
	campusName: string;
	isMainCampus: boolean;
	departmentId: number | null;
	departmentName: string | null;
	firstName: string;
	middleName: string | null;
	lastName: string;
	nameSuffix: string | null;
	academicRank: string | null;
	isActive: boolean;
	hasCompletedOnboarding: boolean;
}

/** The auth context shape used by the router */
export interface AuthContext {
	user: AuthUser | null;
	isAuthenticated: boolean;
}

/** Backend API error shape from Hono */
export interface ApiErrorResponse {
	error: {
		code: string;
		message: string;
	};
}
