import type { AuthUser } from "./auth";

let cachedUser: AuthUser | null = null;
let lastFetched = 0;
const CACHE_DURATION_MS = 10000; // 10 seconds

export function getCachedUser(): AuthUser | null {
	return cachedUser;
}

export function setCachedUser(user: AuthUser | null): void {
	cachedUser = user;
	lastFetched = user ? Date.now() : 0;
}

export function isCacheStale(): boolean {
	return !cachedUser || Date.now() - lastFetched > CACHE_DURATION_MS;
}

export function clearAuthCache(): void {
	cachedUser = null;
	lastFetched = 0;
}
