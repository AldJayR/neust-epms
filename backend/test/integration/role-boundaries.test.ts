import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client.js";
import {
	MOCK_USERS,
	mockMutationChain,
	mockSelectChain,
	setMockUser,
} from "../helpers.js";
import app from "../../src/app.js";

beforeEach(() => {
	setMockUser(MOCK_USERS.superAdmin);
});

describe("Super Admin operational boundaries", () => {
	it("should reject proposal routes", async () => {
		const res = await app.request("/api/v1/proposals");

		expect(res.status).toBe(403);
	});

	it("should reject project routes", async () => {
		const res = await app.request("/api/v1/projects");

		expect(res.status).toBe(403);
	});

	it("should reject report routes", async () => {
		const res = await app.request("/api/v1/reports");

		expect(res.status).toBe(403);
	});

	it("should reject special-order routes", async () => {
		const res = await app.request("/api/v1/special-orders");

		expect(res.status).toBe(403);
	});

	it("should reject operational search types", async () => {
		const res = await app.request(
			"/api/v1/search?q=project&type=projects&limit=10",
		);

		expect(res.status).toBe(403);
	});

	it("should preserve Super Admin access to retention holds", async () => {
		const projectId = "ffffffff-6666-4666-8666-ffffffffffff";
		vi.mocked(db.select).mockReturnValueOnce(
			mockSelectChain([{ projectId, onHold: false }]) as never,
		);
		vi.mocked(db.update).mockReturnValue(
			mockMutationChain([{ projectId, onHold: true }]) as never,
		);

		const res = await app.request(`/api/v1/projects/${projectId}/hold`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ onHold: true }),
		});

		expect(res.status).toBe(200);
	});
});
