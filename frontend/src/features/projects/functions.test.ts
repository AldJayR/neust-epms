import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";

vi.mock("@tanstack/react-start", async () => {
	const { createServerFnMock } = await import(
		"../../../test/server-function-mock"
	);
	return { createServerFn: createServerFnMock };
});

vi.mock("@/lib/session.server", () => ({
	authorizeSessionUser: vi.fn().mockResolvedValue({}),
	getValidAccessToken: vi.fn().mockResolvedValue("test-token"),
}));

import { projectHubQueryOptions } from "./functions";

describe("projectHubQueryOptions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

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
		expect(authorizeSessionUser).toHaveBeenCalledWith("Director", "RET Chair");
		expect(getValidAccessToken).toHaveBeenCalledOnce();
	});

	it("validates query parameters before authorization or fetching", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const options = projectHubQueryOptions({
			page: "invalid" as never,
			limit: 10,
		});
		if (!options.queryFn) throw new Error("Expected a project query function");
		await expect(
			options.queryFn({ queryKey: options.queryKey } as never),
		).rejects.toThrow();
		expect(authorizeSessionUser).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("stops before fetching when authorization fails", async () => {
		vi.mocked(authorizeSessionUser).mockRejectedValueOnce(
			new Error("Forbidden"),
		);
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const options = projectHubQueryOptions({ page: 1, limit: 10 });
		if (!options.queryFn) throw new Error("Expected a project query function");
		await expect(
			options.queryFn({ queryKey: options.queryKey } as never),
		).rejects.toThrow("Forbidden");
		expect(getValidAccessToken).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("surfaces backend project hub errors", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					new Response(
						JSON.stringify({ error: { message: "Project hub unavailable" } }),
						{ status: 503, headers: { "content-type": "application/json" } },
					),
				),
		);
		const options = projectHubQueryOptions({ page: 1, limit: 10 });
		if (!options.queryFn) throw new Error("Expected a project query function");
		await expect(
			options.queryFn({ queryKey: options.queryKey } as never),
		).rejects.toThrow("Project hub unavailable");
	});
});
