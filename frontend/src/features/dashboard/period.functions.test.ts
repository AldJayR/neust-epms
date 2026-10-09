import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", async () => {
	const { createServerFnMock } = await import("../../../test/server-function-mock");
	return { createServerFn: createServerFnMock };
});
vi.mock("@/lib/session.server", () => ({ authorizeSessionUser: vi.fn().mockResolvedValue({}), getValidAccessToken: vi.fn().mockResolvedValue("token") }));
import { facultyDashboardQueryOptions, getFacultyDashboardFn } from "./period.functions";
import { directorDashboardQueryOptions } from "./functions";
import { retDashboardStatsQueryOptions, retProposalsQueryOptions } from "@/features/proposals/ret.functions";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("dashboard year requests", () => {
	it("keeps cached results separate for each year and faculty page", () => {
		expect(facultyDashboardQueryOptions(2025).queryKey).not.toEqual(facultyDashboardQueryOptions(2026).queryKey);
		expect(facultyDashboardQueryOptions(2026, 1).queryKey).not.toEqual(facultyDashboardQueryOptions(2026, 2).queryKey);
		expect(directorDashboardQueryOptions(2025).queryKey).not.toEqual(directorDashboardQueryOptions(2026).queryKey);
		expect(retDashboardStatsQueryOptions(2025).queryKey).not.toEqual(retDashboardStatsQueryOptions(2026).queryKey);
	});
	it("forwards faculty year and pagination without deriving totals from the returned page", async () => {
		const payload = { availableYears: [2026, 2025], metrics: { totalSubmissions: 111, ongoingProjects: 3, proposals: 108 }, items: [], total: 111 };
		const fetchMock = vi.fn().mockResolvedValue(Response.json(payload));
		vi.stubGlobal("fetch", fetchMock);
		expect(await getFacultyDashboardFn({ data: { year: 2026, page: 2, limit: 10 } })).toEqual(payload);
		const url = new URL(fetchMock.mock.calls[0][0]);
		expect(url.searchParams.get("year")).toBe("2026");
		expect(url.searchParams.get("page")).toBe("2");
	});
	it("forwards the selected year to Director and RET statistics and tables", async () => {
		const fetchMock = vi.fn().mockImplementation(async () => Response.json({ items: [], total: 0, availableYears: [2026, 2025], pendingReview: 0, approvedProjects: 0, deniedProjects: 0 }));
		vi.stubGlobal("fetch", fetchMock);
		for (const options of [directorDashboardQueryOptions(2025), retDashboardStatsQueryOptions(2025), retProposalsQueryOptions({ year: 2025, page: 1, limit: 10 })]) {
			await options.queryFn?.({ queryKey: options.queryKey } as never);
		}
		expect(fetchMock.mock.calls).toHaveLength(3);
		for (const [url] of fetchMock.mock.calls) expect(new URL(url).searchParams.get("year")).toBe("2025");
	});

	it("rejects a legacy dashboard response instead of presenting unfiltered totals as year-filtered", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ metrics: { totalProjects: 99 } })));
		const options = directorDashboardQueryOptions(2026);
		await expect(options.queryFn?.({ queryKey: options.queryKey } as never)).rejects.toThrow();
	});
});
