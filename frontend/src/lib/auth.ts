// ── Shared auth types (safe to import on client and server) ──

/** The user profile stored in session and returned by getCurrentUser */
export interface AuthUser {
	userId: string;
	email: string;
	roleName: string;
	firstName: string;
	lastName: string;
	campusName: string;
	departmentName: string | null;
	isActive: boolean;
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
