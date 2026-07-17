import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { rateLimiter } from "hono-rate-limiter";
import { db } from "./db/client.js";
import { env } from "./env.js";
import { getClientIp } from "./lib/client-ip.js";
import { installApiErrorHandler } from "./lib/errors.js";
import { OPERATIONAL_ROLES } from "./lib/types.js";
import { type AuthEnv, authMiddleware } from "./middleware/auth.js";
import { requireRole } from "./middleware/rbac.js";
import actionCenterRoutes from "./modules/action-center/index.js";
import adminRoutes from "./modules/admin/index.js";
import auditRoutes from "./modules/audit/index.js";
import authRoutes from "./modules/auth/index.js";
import directorRoutes from "./modules/director/index.js";
import memberRoutes from "./modules/members/index.js";
import moaRoutes from "./modules/moas/index.js";
import notificationRoutes from "./modules/notifications/index.js";
import projectRoutes from "./modules/projects/index.js";
import proposalRoutes from "./modules/proposals/index.js";
import reportRoutes from "./modules/reports/index.js";
import searchRoutes from "./modules/search/index.js";
import settingRoutes from "./modules/settings/index.js";
import specialOrderRoutes from "./modules/special-orders/index.js";
import storageRoutes from "./modules/storage/index.js";

// ── Create root app ──
const app = new OpenAPIHono<AuthEnv>();

// ── Global middleware ──
app.use("*", logger());
app.use(
	"*",
	secureHeaders({
		contentSecurityPolicy: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
			styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
			connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
			imgSrc: ["'self'", "data:", "blob:"],
		},
		xFrameOptions: "DENY",
	}),
);
app.use("*", requestId());
app.use(
	"*",
	cors({
		origin: env.CORS_ORIGINS,
		credentials: true,
	}),
);

// ── Global rate limiter: 100 req/min per IP ──
// Keyed by the connection address unless TRUST_PROXY=true, so clients
// cannot bypass the limit by spoofing forwarding headers.
const globalLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 100,
	standardHeaders: "draft-6",
	keyGenerator: (c) => getClientIp(c),
});
app.use("*", globalLimiter);

// ── Global body size limit: 1MB for JSON, uploads handled per-route ──
const MAX_MULTIPART_BYTES = 50 * 1024 * 1024;

app.use("*", async (c, next) => {
	const contentLengthHeader = c.req.header("content-length");
	const contentLength = Number(contentLengthHeader ?? 0);
	const contentType = c.req.header("content-type") ?? "";

	if (contentType.includes("multipart/form-data")) {
		// Hono buffers form data before route handlers can inspect individual files.
		// Require an upfront, server-enforced bound to prevent unbounded buffering.
		if (!contentLengthHeader || !Number.isSafeInteger(contentLength)) {
			return c.json(
				{
					error: {
						code: "LENGTH_REQUIRED",
						message: "Multipart uploads require a valid Content-Length header",
					},
				},
				411,
			);
		}
		if (contentLength > MAX_MULTIPART_BYTES) {
			return c.json(
				{
					error: {
						code: "PAYLOAD_TOO_LARGE",
						message: "Upload exceeds 50MB limit",
					},
				},
				413,
			);
		}
		return next();
	}

	if (contentLength > 1_048_576) {
		return c.json(
			{
				error: {
					code: "PAYLOAD_TOO_LARGE",
					message: "Request body exceeds 1MB limit",
				},
			},
			413,
		);
	}

	return next();
});

// ── Request timeout: 30s ──
app.use("*", async (c, next) => {
	const controller = new AbortController();
	const { signal } = controller;
	const timer = setTimeout(() => controller.abort(), 30_000);

	try {
		await Promise.race([
			next(),
			new Promise<never>((_, reject) => {
				signal.addEventListener(
					"abort",
					() => reject(new Error("Request timeout")),
					{ once: true },
				);
			}),
		]);
	} catch (error) {
		if (error instanceof Error && error.message === "Request timeout") {
			return c.json(
				{
					error: {
						code: "REQUEST_TIMEOUT",
						message: "Request exceeded 30s timeout",
					},
				},
				408,
			);
		}
		throw error;
	} finally {
		clearTimeout(timer);
	}
});

// ── Global error handler ──
installApiErrorHandler(app);

// ── Not found handler ──
// Unknown routes are an honest 404. Authentication failures (401) are
// raised by authMiddleware on protected routes, never synthesized here.
app.notFound((c) =>
	c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404),
);

// ── PUBLIC ROUTES (Must be before protected route mounts) ──

// Health check
app.get("/api/v1/health", async (c) => {
	try {
		await db.execute(sql`SELECT 1`);
		return c.json({
			status: "ok",
			db: "connected",
			timestamp: new Date().toISOString(),
		});
	} catch {
		return c.json(
			{
				status: "degraded",
				db: "disconnected",
				timestamp: new Date().toISOString(),
			},
			503,
		);
	}
});

// OpenAPI document (base, used by getOpenAPIDocument)
app.doc("/api/v1/doc", {
	openapi: "3.0.0",
	info: {
		title: "NEUST Extension Services Project Management System API",
		version: "1.0.0",
		description:
			"RESTful API for the Web-Based Extension Services Project Management System for NEUST",
	},
});

// Enriched spec with security schemes
app.get("/api/v1/openapi.json", (c) => {
	const baseDoc = app.getOpenAPIDocument({
		openapi: "3.0.0",
		info: {
			title: "NEUST Extension Services Project Management System API",
			version: "1.0.0",
			description:
				"RESTful API for the Web-Based Extension Services Project Management System for NEUST",
		},
	});

	const enriched = {
		...baseDoc,
		components: {
			...(baseDoc.components ?? {}),
			securitySchemes: {
				Bearer: {
					type: "http" as const,
					scheme: "bearer",
					bearerFormat: "JWT",
					description: "Supabase JWT token",
				},
			},
		},
	};

	return c.json(enriched);
});

// Swagger UI
app.get("/api/v1/swagger", swaggerUI({ url: "/api/v1/openapi.json" }));

// ── PROTECTED MOUNT POINTS ──

// Shared auth for all /proposals/* routes. The proposals, members, and storage
// sub-apps all serve paths under /proposals, so registering authMiddleware once
// here guarantees exactly one Supabase token validation per request instead of
// each sub-app re-registering its own wildcard auth (which previously ran
// authMiddleware multiple times per proposal request).
app.use("/api/v1/proposals", authMiddleware);
app.use("/api/v1/proposals/*", authMiddleware);
app.use("/api/v1/proposals", requireRole(...OPERATIONAL_ROLES));
app.use("/api/v1/proposals/*", requireRole(...OPERATIONAL_ROLES));

app.route("/api/v1", authRoutes);
app.route("/api/v1", actionCenterRoutes);
app.route("/api/v1", notificationRoutes);
app.route("/api/v1", proposalRoutes);
app.route("/api/v1", memberRoutes);
app.route("/api/v1", specialOrderRoutes);
app.route("/api/v1", moaRoutes);
app.route("/api/v1", projectRoutes);
app.route("/api/v1", storageRoutes);
app.route("/api/v1", reportRoutes);
app.route("/api/v1", auditRoutes);
app.route("/api/v1", settingRoutes);
app.route("/api/v1", adminRoutes);
app.route("/api/v1", directorRoutes);
app.route("/api/v1", searchRoutes);

export default app;
