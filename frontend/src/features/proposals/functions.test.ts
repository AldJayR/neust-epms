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

import { recordInstitutionalApprovalFn, reviewProposalFn } from "./functions";

describe("reviewProposalFn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("submits a proposal review with authorization and returns the response", async () => {
		const body = { message: "Review submitted" };
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(body), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = await reviewProposalFn({
			data: {
				proposalId: "00000000-0000-4000-8000-000000000001",
				decision: "Approved",
				comments: "Looks good",
			},
		});

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:3001/api/v1/proposals/00000000-0000-4000-8000-000000000001/review",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify({ decision: "Approved", comments: "Looks good" }),
			},
		);
		expect(result).toEqual(body);
		expect(authorizeSessionUser).toHaveBeenCalledWith("Director", "RET Chair");
		expect(getValidAccessToken).toHaveBeenCalledOnce();
	});

	it("rejects invalid input before authorization or an API request", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		await expect(
			reviewProposalFn({
				data: { proposalId: "invalid-id", decision: "Endorsed" },
			}),
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
		await expect(
			reviewProposalFn({
				data: {
					proposalId: "00000000-0000-4000-8000-000000000001",
					decision: "Endorsed",
				},
			}),
		).rejects.toThrow("Forbidden");
		expect(getValidAccessToken).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("surfaces backend review errors", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						error: { message: "Proposal must be endorsed first" },
					}),
					{ status: 400, headers: { "content-type": "application/json" } },
				),
			),
		);
		await expect(
			reviewProposalFn({
				data: {
					proposalId: "00000000-0000-4000-8000-000000000001",
					decision: "Approved",
				},
			}),
		).rejects.toThrow("Proposal must be endorsed first");
	});

	it("also executes function validators before upload handlers", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		await expect(
			recordInstitutionalApprovalFn({ data: new FormData() }),
		).rejects.toThrow("Proposal ID is required");
		expect(authorizeSessionUser).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
