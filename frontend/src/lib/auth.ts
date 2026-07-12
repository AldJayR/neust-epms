// ── Shared auth types (safe to import on client and server) ──

import type { AuthUser } from "@/types/user";

export type { AuthUser } from "@/types/user";

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
