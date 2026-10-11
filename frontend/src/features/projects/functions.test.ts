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

import { closeProjectFn, projectHubQueryOptions } from "./functions";

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

describe("closeProjectFn", () => {
	const projectId = "ffffffff-6666-4666-8666-ffffffffffff";
	function form(file: File | null = new File(["%PDF-1.4\nsigned"], "signed.pdf", { type: "application/pdf" })) {
		const data = new FormData();
		data.set("projectId", projectId);
		if (file) data.set("file", file);
		return data;
	}
	beforeEach(() => vi.clearAllMocks());
	afterEach(() => vi.unstubAllGlobals());

	it("sends the signed report as multipart data with Director authorization", async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Project closed" }), { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		const data = form();
		await closeProjectFn({ data });
		expect(authorizeSessionUser).toHaveBeenCalledWith("Director");
		expect(fetchMock).toHaveBeenCalledWith(`http://localhost:3001/api/v1/projects/${projectId}/close`, {
			method: "POST", headers: { Authorization: "Bearer test-token" }, body: data,
		});
	});

	it("requires a signed file before making a request", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		await expect(closeProjectFn({ data: form(null) })).rejects.toThrow();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("rejects an empty PDF before making a request", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		await expect(closeProjectFn({ data: form(new File([], "empty.pdf", { type: "application/pdf" })) })).rejects.toThrow();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("does not upload when Director authorization fails", async () => {
		vi.mocked(authorizeSessionUser).mockRejectedValueOnce(new Error("Forbidden"));
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		await expect(closeProjectFn({ data: form() })).rejects.toThrow("Forbidden");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("shows the backend closure error", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Project already closed" } }), { status: 400 })));
		await expect(closeProjectFn({ data: form() })).rejects.toThrow("Project already closed");
	});
});
