import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client.js";
import { installApiErrorHandler } from "@/lib/errors.js";
import { currentManilaYear } from "@/lib/project-period.js";
import { MOCK_USERS, mockSelectChain, setMockUser } from "../../../test/helpers.js";
import app from "./index.js";

installApiErrorHandler(app);
beforeEach(() => { setMockUser(MOCK_USERS.faculty); });

describe("dashboard endpoints", () => {
	it("rejects Super Admin access to the operational Faculty dashboard", async () => {
		setMockUser(MOCK_USERS.superAdmin);
		expect((await app.request("/dashboard/faculty")).status).toBe(403);
		expect(db.select).not.toHaveBeenCalled();
	});
	it("rejects invalid years before executing a dashboard query", async () => {
		for (const year of ["2026.5", "invalid", "2201"]) expect((await app.request(`/dashboard/faculty?year=${year}`)).status).toBe(400);
		expect(db.select).not.toHaveBeenCalled();
	});
	it("accepts an omitted year and returns current-year metadata with empty data", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);
		const response = await app.request("/dashboard/faculty");
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ availableYears: [currentManilaYear()], total: 0, items: [] });
	});
});
