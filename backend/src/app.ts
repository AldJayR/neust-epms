import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { requestId } from "hono/request-id";
import { swaggerUI } from "@hono/swagger-ui";
import { HTTPException } from "hono/http-exception";
import { ApiError, createErrorResponse } from "./lib/errors.js";
import type { AuthEnv } from "./middleware/auth.js";

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

// ── Create root app ──
const app = new OpenAPIHono<AuthEnv>();

// ── Global middleware ──
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", requestId());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3001", "http://localhost:5173"],
    credentials: true,
  }),
);

// ── Global error handler ──
app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(createErrorResponse(err), err.status);
  }
  if (err instanceof HTTPException) {
    return c.json(
      { error: { code: "HTTP_ERROR", message: err.message } },
      err.status,
    );
  }
  console.error("Unhandled error:", err);
  return c.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    500,
  );
});

// ── Not found handler ──
app.notFound((c) =>
  c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404),
);

// ── Mount route modules ──
app.route("/api", authRoutes);
app.route("/api", proposalRoutes);
app.route("/api", memberRoutes);
app.route("/api", specialOrderRoutes);
app.route("/api", moaRoutes);
app.route("/api", projectRoutes);
app.route("/api", storageRoutes);
app.route("/api", reportRoutes);
app.route("/api", auditRoutes);
app.route("/api", settingRoutes);

// ── OpenAPI document (base, used by getOpenAPIDocument) ──
app.doc("/api/doc", {
  openapi: "3.0.0",
  info: {
    title: "NEUST Extension Services Project Management System API",
    version: "1.0.0",
    description:
      "RESTful API for the Web-Based Extension Services Project Management System for NEUST",
  },
});

// ── Enriched spec with security schemes ──
app.get("/api/openapi.json", (c) => {
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

// ── Swagger UI (points to enriched spec) ──
app.get("/api/swagger", swaggerUI({ url: "/api/openapi.json" }));

// ── Health check ──
app.get("/api/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);

export default app;
