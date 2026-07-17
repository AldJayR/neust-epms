/**
 * Integration tests for the Hono app shell.
 *
 * Tests the global error handler, 404 handler, and health check.
 * These don't require auth or DB access.
 */
import { describe, it, expect, vi } from "vitest";

vi.unmock("./middleware/auth.js");

import app from "./app.js";

describe("App shell", () => {
	describe("CORS", () => {
		it("allows configured origins with credentials", async () => {
			const res = await app.request("/api/v1/health", {
				headers: { Origin: "http://localhost:5173" },
			});

			expect(res.headers.get("access-control-allow-origin")).toBe(
				"http://localhost:5173",
			);
			expect(res.headers.get("access-control-allow-credentials")).toBe("true");
		});

		it("does not allow unconfigured origins", async () => {
			const res = await app.request("/api/v1/health", {
				headers: { Origin: "https://attacker.example.com" },
			});

			expect(res.headers.get("access-control-allow-origin")).toBeNull();
		});
	});

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
			// This verifies that protected paths return 401 when unauthenticated.
			const res = await app.request("/api/v1/proposals/00000000-0000-0000-0000-000000000000");

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
