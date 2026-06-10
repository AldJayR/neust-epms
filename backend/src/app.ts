import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { requestId } from "hono/request-id";
import { swaggerUI } from "@hono/swagger-ui";
import { rateLimiter } from "hono-rate-limiter";
import { installApiErrorHandler } from "./lib/errors.js";
import type { AuthEnv } from "./middleware/auth.js";
import { db } from "./db/client.js";
import { sql } from "drizzle-orm";

import authRoutes from "./routes/auth.routes.js";
import proposalRoutes from "./routes/proposals.routes.js";
import memberRoutes from "./routes/members.routes.js";
import specialOrderRoutes from "./routes/special-orders.routes.js";
import moaRoutes from "./routes/moas.routes.js";
import projectRoutes from "./routes/projects.routes.js";
import storageRoutes from "./routes/storage.routes.js";
import reportRoutes from "./routes/reports.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import settingRoutes from "./routes/settings.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import directorRoutes from "./routes/director.routes.js";

// ── Create root app ──
const app = new OpenAPIHono<AuthEnv>();

// ── Global middleware ──
app.use("*", logger());
app.use(
	"*",
	secureHeaders({
		contentSecurityPolicy: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			imgSrc: ["'self'", "data:", "blob:"],
		},
		xFrameOptions: "DENY",
	}),
);
app.use("*", requestId());
app.use(
	"*",
	cors({
		origin: ["http://localhost:3001", "http://localhost:5173"],
		credentials: true,
	}),
);

// ── Global rate limiter: 100 req/min per IP ──
const globalLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 100,
	standardHeaders: "draft-6",
	keyGenerator: (c) =>
		c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown",
});
app.use("*", globalLimiter);

// ── Global body size limit: 1MB for JSON, uploads handled per-route ──
app.use("*", async (c, next) => {
	const contentLength = Number(c.req.header("content-length") ?? 0);
	const contentType = c.req.header("content-type") ?? "";

	// Skip for file uploads (handled by storage route)
	if (contentType.includes("multipart/form-data")) {
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
	const timeout = setTimeout(() => controller.abort(), 30_000);
	try {
		await next();
	} finally {
		clearTimeout(timeout);
	}
});

// ── Global error handler ──
installApiErrorHandler(app);

// ── Not found handler ──
app.notFound((c) =>
	c.req.path.startsWith("/api/v1")
		? c.json(
				{
					error: {
						code: "MISSING_TOKEN",
						message: "Authorization header is required",
					},
				},
				401,
			)
		: c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404),
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
app.route("/api/v1", authRoutes);
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

export default app;
