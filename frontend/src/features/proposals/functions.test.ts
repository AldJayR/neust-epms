import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session.server", () => ({
	authorizeSessionUser: vi.fn().mockResolvedValue({}),
	getValidAccessToken: vi.fn().mockResolvedValue("test-token"),
}));

import { reviewProposalFn } from "./functions";

describe("reviewProposalFn", () => {
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
	});
});
