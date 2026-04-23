/**
 * Integration tests for the Hono app shell.
 *
 * Tests the global error handler, 404 handler, and health check.
 * These don't require auth or DB access.
 */
import { describe, it, expect } from "vitest";
import app from "./app.js";

describe("App shell", () => {
  describe("GET /api/v1/health", () => {
    it("should return 200 with status ok", async () => {
      const res = await app.request("/api/v1/health");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.timestamp).toBeDefined();
    });
  });

  describe("404 handler", () => {
    it("should return 404 JSON for routes outside /api", async () => {
      // Routes under /api may hit an auth middleware wildcard first,
      // so we test with a path completely outside any mounted module.
      const res = await app.request("/totally-unknown");

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("should return 401 for unknown /api/v1 routes (auth middleware intercepts)", async () => {
      // This verifies that all /api/v1/* paths are protected —
      // even non-existent ones return 401, not 404.
      const res = await app.request("/api/v1/nonexistent-route");

      expect(res.status).toBe(401);
    });
  });

  describe("OpenAPI spec", () => {
    it("should serve the OpenAPI JSON document at /api/v1/openapi.json", async () => {
      const res = await app.request("/api/v1/openapi.json");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.openapi).toBe("3.0.0");
      expect(body.info.title).toContain("NEUST");
      expect(body.components.securitySchemes.Bearer).toBeDefined();
    });

    it("should serve the base doc at /api/v1/doc", async () => {
      const res = await app.request("/api/v1/doc");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.openapi).toBe("3.0.0");
    });
  });

  describe("Swagger UI", () => {
    it("should serve the Swagger UI page at /api/v1/swagger", async () => {
      const res = await app.request("/api/v1/swagger");

      expect(res.status).toBe(200);
      const contentType = res.headers.get("content-type");
      expect(contentType).toContain("text/html");
    });
  });
});
