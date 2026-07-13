import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session.server", () => ({
	authorizeSessionUser: vi.fn().mockResolvedValue({}),
	getValidAccessToken: vi.fn().mockResolvedValue("test-token"),
}));

import { projectHubQueryOptions } from "./functions";

describe("projectHubQueryOptions", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("requests the project hub with authorization and returns the response", async () => {
		const body = { items: [], total: 0 };
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(body), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const options = projectHubQueryOptions({ page: 2, limit: 10 });
		if (!options.queryFn) throw new Error("Expected a project query function");
		const result = await options.queryFn({
			queryKey: options.queryKey,
		} as never);

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:3001/api/v1/director/hub/projects?page=2&limit=10",
			{ headers: { Authorization: "Bearer test-token" } },
		);
		expect(result).toEqual(body);
	});
});
