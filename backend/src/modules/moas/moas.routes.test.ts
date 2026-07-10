import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import {
	setMockUser,
	MOCK_USERS,
	createMockMoa,
	mockSelectChain,
} from "../../../test/helpers.js";
import app from "./index.js";
import { installApiErrorHandler } from "@/lib/errors.js";

installApiErrorHandler(app);

beforeEach(() => {
	setMockUser(MOCK_USERS.director);
});

describe("GET /moas", () => {
	it("should return a list of MOAs", async () => {
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([createMockMoa()]) as never,
		);
		const res = await app.request("/moas");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.items).toHaveLength(1);
	});
});
