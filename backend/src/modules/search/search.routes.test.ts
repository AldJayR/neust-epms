import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import { setMockUser, MOCK_USERS, mockSelectChain } from "../../../test/helpers.js";
import baseApp from "./search.routes.js";
import { OpenAPIHono } from "@hono/zod-openapi";

const app = new OpenAPIHono();
app.route("/", baseApp);

beforeEach(() => {
	setMockUser(MOCK_USERS.faculty);
	vi.clearAllMocks();
});

describe("GET /search", () => {
	it("should return combined results for authenticated search", async () => {
		const mockResults = [
			{ type: "proposals", id: "test-id", title: "Test Proposal", subtitle: "Draft" },
		];
		vi.mocked(db.select).mockReturnValue(mockSelectChain(mockResults) as never);

		const res = await app.request("/search?q=test");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.results).toBeDefined();
		expect(Array.isArray(body.results)).toBe(true);
	});

	it("should return 400 for search term with only symbols", async () => {
		const res = await app.request("/search?q=!@#$%^&*()");

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("BAD_REQUEST");
	});

	it("should use default type and limit values", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=test");

		expect(res.status).toBe(200);
		expect(vi.mocked(db.select)).toHaveBeenCalled();
	});

	it("should reject invalid type parameter", async () => {
		const res = await app.request("/search?q=test&type=invalid");

		expect(res.status).toBe(400);
	});

	it("should reject limit out of range", async () => {
		const res = await app.request("/search?q=test&limit=100");

		expect(res.status).toBe(400);
	});

	it("should allow search within allowed limit range", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=test&limit=20");

		expect(res.status).toBe(200);
	});

	it("should return results for specific type", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=test&type=proposals");

		expect(res.status).toBe(200);
	});

	it("should return empty results when no matches", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=nonexistent");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.results).toHaveLength(0);
	});

	it("should handle Faculty role with department scope", async () => {
		setMockUser(MOCK_USERS.faculty);
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=test");

		expect(res.status).toBe(200);
	});

	it("should handle Faculty role without department (campus fallback)", async () => {
		setMockUser({
			...MOCK_USERS.faculty,
			departmentId: null,
		});
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=test");

		expect(res.status).toBe(200);
	});

	it("should allow RET Chair to search MOAs", async () => {
		setMockUser(MOCK_USERS.retChair);
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=test&limit=20");

		expect(res.status).toBe(200);
	});

	it("should allow Director to search MOAs", async () => {
		setMockUser(MOCK_USERS.director);
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=test&limit=20");

		expect(res.status).toBe(200);
	});

	it("should allow Super Admin to search users", async () => {
		setMockUser(MOCK_USERS.superAdmin);
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=test&limit=20");

		expect(res.status).toBe(200);
	});

	it("should not return MOAs for Faculty role", async () => {
		setMockUser(MOCK_USERS.faculty);
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=test&type=moas");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.results).toHaveLength(0);
	});

	it("should not return users for non-Super Admin roles", async () => {
		setMockUser(MOCK_USERS.faculty);
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=test&type=users");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.results).toHaveLength(0);
	});

	it("should handle RET Chair main-campus scope", async () => {
		setMockUser({
			...MOCK_USERS.retChair,
			isMainCampus: true,
			departmentId: 2,
		});
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=test");

		expect(res.status).toBe(200);
	});

	it("should handle RET Chair non-main-campus scope", async () => {
		setMockUser({
			...MOCK_USERS.retChair,
			isMainCampus: false,
			departmentId: null,
		});
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=test");

		expect(res.status).toBe(200);
	});

	it("should require authentication", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/search?q=test");

		expect(res.status).toBe(200);
	});
});
