import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { rateLimiter } from "hono-rate-limiter";
import { getClientIp } from "@/lib/client-ip.js";

import { ErrorSchema } from "@/lib/schemas.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import {
	CheckPasswordBodySchema,
	CheckPasswordResponseSchema,
	LoginBodySchema,
	LoginResponseSchema,
	LogoutResponseSchema,
	OnboardingCompleteResponseSchema,
	RegisterUserBodySchema,
	UserResponseSchema,
	UserSearchQuerySchema,
	UserSearchResponseSchema,
} from "./auth.schema.js";
import {
	checkPassword,
	completeOnboarding,
	listCampuses,
	listDepartments,
	login,
	logout,
	registerUser,
	searchUsers,
} from "./auth.service.js";

const app = new OpenAPIHono<AuthEnv>();

// ── POST /auth/check-password (Public) ──
const checkPasswordRoute = createRoute({
	method: "post",
	path: "/auth/check-password",
	tags: ["Auth"],
	summary: "Check if a password has been compromised",
	request: {
		body: {
			content: { "application/json": { schema: CheckPasswordBodySchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: CheckPasswordResponseSchema } },
			description: "Result of compromised password check",
		},
		503: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Password safety check is unavailable",
		},
	},
});

const checkPasswordLimiter = rateLimiter({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: "draft-6",
	keyGenerator: (c) => getClientIp(c),
});
app.use("/auth/check-password", checkPasswordLimiter);

app.openapi(checkPasswordRoute, async (c) => {
	const { password } = c.req.valid("json");
	const compromised = await checkPassword(password);
	return c.json({ compromised }, 200);
});

// ── GET /auth/me ──
const getMeRoute = createRoute({
	method: "get",
	path: "/auth/me",
	tags: ["Auth"],
	summary: "Get the currently authenticated user profile",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: UserResponseSchema } },
			description: "Current user profile",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
	},
});

const registerLimiter = rateLimiter({
	windowMs: 15 * 60 * 1000,
	limit: 5,
	standardHeaders: "draft-6",
	keyGenerator: (c) => getClientIp(c),
});

// ── POST /auth/register (Public self-registration) ──
const registerRoute = createRoute({
	method: "post",
	path: "/auth/register",
	tags: ["Auth"],
	summary: "Register a new faculty account",
	request: {
		body: {
			content: { "application/json": { schema: RegisterUserBodySchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: UserResponseSchema } },
			description: "User registered",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Validation error or user already exists",
		},
		503: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Password safety check is unavailable",
		},
	},
});

app.use("/auth/register", registerLimiter);

app.openapi(registerRoute, async (c) => {
	const body = c.req.valid("json");
	const result = await registerUser(body, getClientIp(c));
	return c.json(result, 201);
});

// ── Protected Routes ──
app.use("/auth/me", authMiddleware);

app.openapi(getMeRoute, async (c) => {
	const authUser = c.get("user");
	return c.json(authUser, 200);
});

// ── GET /auth/departments ──
const listDepartmentsRoute = createRoute({
	method: "get",
	path: "/auth/departments",
	tags: ["Auth"],
	summary: "List all departments (public)",
	responses: {
		200: {
			description: "Department list",
		},
	},
});

app.openapi(listDepartmentsRoute, async (c) => {
	const result = await listDepartments();
	return c.json(result, 200);
});

// ── GET /auth/campuses ──
const listCampusesRoute = createRoute({
	method: "get",
	path: "/auth/campuses",
	tags: ["Auth"],
	summary: "List all campuses (public)",
	responses: {
		200: {
			description: "Campus list",
		},
	},
});

app.openapi(listCampusesRoute, async (c) => {
	const result = await listCampuses();
	return c.json(result, 200);
});

// ── GET /auth/users/search ──
const searchUsersRoute = createRoute({
	method: "get",
	path: "/auth/users/search",
	tags: ["Auth"],
	summary: "Search for users (Faculty list for team composition)",
	security: [{ Bearer: [] }],
	request: { query: UserSearchQuerySchema },
	responses: {
		200: {
			content: { "application/json": { schema: UserSearchResponseSchema } },
			description: "Matching users",
		},
	},
});

app.use("/auth/users/search", authMiddleware);

app.openapi(searchUsersRoute, async (c) => {
	const { search } = c.req.valid("query");
	const result = await searchUsers(search);
	return c.json(result, 200);
});

// ── POST /auth/login (Public) ──
const loginRoute = createRoute({
	method: "post",
	path: "/auth/login",
	tags: ["Auth"],
	summary: "Login with email and password",
	request: {
		body: {
			content: { "application/json": { schema: LoginBodySchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: LoginResponseSchema } },
			description: "Login successful",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid credentials",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Account not activated",
		},
	},
});

const loginLimiter = rateLimiter({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: "draft-6",
	keyGenerator: (c) => getClientIp(c),
});
app.use("/auth/login", loginLimiter);

app.openapi(loginRoute, async (c) => {
	const body = c.req.valid("json");
	const result = await login(body, getClientIp(c));
	return c.json(result, 200);
});

// ── POST /auth/logout (Authenticated) ──
const logoutRoute = createRoute({
	method: "post",
	path: "/auth/logout",
	tags: ["Auth"],
	summary: "Logout and invalidate session",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: LogoutResponseSchema } },
			description: "Logged out",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
	},
});

app.use("/auth/logout", authMiddleware);

app.openapi(logoutRoute, async (c) => {
	const authUser = c.get("user");
	const authHeader = c.req.header("Authorization");
	const token = authHeader?.slice(7);
	const result = await logout(authUser, token, getClientIp(c));
	return c.json(result, 200);
});

// ── POST /auth/onboarding/complete ──
const completeOnboardingRoute = createRoute({
	method: "post",
	path: "/auth/onboarding/complete",
	tags: ["Auth"],
	summary: "Mark onboarding as completed for the current user",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: {
				"application/json": { schema: OnboardingCompleteResponseSchema },
			},
			description: "Onboarding completed successfully",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
	},
});

app.use("/auth/onboarding/complete", authMiddleware);

app.openapi(completeOnboardingRoute, async (c) => {
	const authUser = c.get("user");
	const result = await completeOnboarding(authUser.userId);
	return c.json(result, 200);
});

export default app;
