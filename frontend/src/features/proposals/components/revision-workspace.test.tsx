// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RevisionRequest } from "../revisions.functions";
import { RevisionWorkspace } from "./revision-workspace";

const api = vi.hoisted(() => ({
	list: vi.fn(),
	readiness: vi.fn(),
	save: vi.fn(),
	verify: vi.fn(),
	reopen: vi.fn(),
	create: vi.fn(),
	url: vi.fn(),
}));
vi.mock("../revisions.functions", () => ({
	getRevisionRequestsFn: api.list,
	saveRevisionResponseFn: api.save,
	verifyRevisionFn: api.verify,
	reopenRevisionFn: api.reopen,
	createRevisionRequestFn: api.create,
	getRevisionDocumentUrlFn: api.url,
	revisionReadinessQueryOptions: (proposalId: string) => ({
		queryKey: ["proposal-revisions", proposalId, "readiness"],
		queryFn: api.readiness,
	}),
}));
vi.mock("../comments.functions", () => ({
	getProposalCommentsFn: vi.fn().mockResolvedValue([]),
}));
vi.mock("./pdf-viewer", () => ({ PdfViewer: () => <div>PDF preview</div> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const proposalId = "00000000-0000-4000-8000-000000000001";
const request: RevisionRequest = {
	requestId: "00000000-0000-4000-8000-000000000002",
	content: "Clarify assessment criteria",
	reviewStage: "Endorsement",
	status: "Response needed",
	createdBy: "Chair Reviewer",
	createdAt: "2026-10-09T00:00:00Z",
	commentId: null,
	documentId: "original-document",
	version: 1,
	originalPage: 2,
	canRespond: true,
	canVerify: false,
	canReopen: false,
	reopenings: [],
	draft: null,
	responses: [],
};

function mount() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<RevisionWorkspace proposalId={proposalId} />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	vi.resetAllMocks();
	api.list.mockResolvedValue({
		items: [request],
		total: 1,
		page: 1,
		limit: 20,
	});
	api.readiness.mockResolvedValue({
		canRespond: true,
		canReview: false,
		stage: null,
		outstanding: 1,
		answered: 0,
		revisedDocumentReady: true,
	});
	api.save.mockResolvedValue({ message: "Saved" });
	api.verify.mockResolvedValue({ message: "Verified" });
	api.reopen.mockResolvedValue({ message: "Reopened" });
});
afterEach(cleanup);

describe("revision feedback workspace", () => {
	it("uses the separate reopen action for a historical resolved request without a current response", async () => {
		api.list.mockResolvedValue({
			items: [
				{
					...request,
					status: "Resolved",
					canRespond: false,
					canVerify: false,
					canReopen: true,
					responses: [
						{
							responseId: "historical-response",
							responseType: "Changed",
							explanation: "Threshold accepted in v2",
							respondedBy: "Leader",
							revisedPage: 3,
							documentId: "old-revision",
							version: 2,
							submittedAt: "2026-10-09T01:00:00Z",
							updatedAt: "2026-10-09T01:00:00Z",
							verifications: [
								{
									decision: "Resolved",
									verifiedBy: "Chair",
									verifiedAt: "2026-10-09T02:00:00Z",
									explanation: null,
								},
							],
						},
					],
				},
			],
			total: 1,
			page: 1,
			limit: 20,
		});
		api.readiness.mockResolvedValue({
			canRespond: false,
			canReview: true,
			stage: "Endorsement",
			outstanding: 0,
			stageOutstanding: 0,
		});
		mount();
		fireEvent.change(screen.getByLabelText("Filter revision status"), {
			target: { value: "Resolved" },
		});
		fireEvent.click(
			await screen.findByRole("button", { name: "Reopen request" }),
		);
		expect(
			(
				screen.getByRole("button", {
					name: "Confirm reopening",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		fireEvent.change(
			screen.getByLabelText("Explain why this request needs reopening"),
			{ target: { value: "The threshold disappeared in v3" } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Confirm reopening" }));
		await waitFor(() =>
			expect(api.reopen).toHaveBeenCalledWith({
				data: {
					proposalId,
					requestId: request.requestId,
					explanation: "The threshold disappeared in v3",
				},
			}),
		);
		expect(api.verify).not.toHaveBeenCalled();
	});

	it("lets the leader save an explanation linked to an optional revised page", async () => {
		mount();
		await screen.findByText("Clarify assessment criteria");
		expect(
			(
				screen.getByRole("button", {
					name: "Save response",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		fireEvent.change(
			screen.getByLabelText("Explain how you handled the revision request"),
			{ target: { value: "Added measurable assessment criteria" } },
		);
		fireEvent.change(screen.getByLabelText("Revised PDF page (optional)"), {
			target: { value: "5" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save response" }));
		await waitFor(() =>
			expect(api.save).toHaveBeenCalledWith({
				data: {
					proposalId,
					requestId: request.requestId,
					responseType: "Changed",
					explanation: "Added measurable assessment criteria",
					revisedPage: 5,
				},
			}),
		);
	});

	it("requires an explanation before the reviewer requests further revision", async () => {
		api.list.mockResolvedValue({
			items: [
				{
					...request,
					status: "Awaiting verification",
					canRespond: false,
					canVerify: true,
					responses: [
						{
							responseId: "current-response",
							responseType: "Changed",
							explanation: "Added assessment method",
							respondedBy: "Leader",
							revisedPage: 5,
							documentId: "revised-document",
							version: 2,
							submittedAt: "2026-10-09T01:00:00Z",
							updatedAt: "2026-10-09T01:00:00Z",
							verifications: [],
						},
					],
				},
			],
			total: 1,
			page: 1,
			limit: 20,
		});
		api.readiness.mockResolvedValue({
			canRespond: false,
			canReview: true,
			stage: "Endorsement",
			outstanding: 1,
			stageOutstanding: 1,
		});
		mount();
		fireEvent.click(
			await screen.findByRole("button", { name: "Needs further revision" }),
		);
		expect(
			(
				screen.getByRole("button", {
					name: "Save verification",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		fireEvent.change(
			screen.getByLabelText("Explain what still needs revision"),
			{ target: { value: "Define the success threshold too" } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Save verification" }));
		await waitFor(() =>
			expect(api.verify).toHaveBeenCalledWith({
				data: {
					proposalId,
					requestId: request.requestId,
					responseId: "current-response",
					decision: "Further revision needed",
					explanation: "Define the success threshold too",
				},
			}),
		);
	});

	it("does not offer verification actions for another review stage", async () => {
		api.list.mockResolvedValue({
			items: [
				{
					...request,
					reviewStage: "Approval",
					status: "Awaiting verification",
					canRespond: false,
					canVerify: false,
				},
			],
			total: 1,
			page: 1,
			limit: 20,
		});
		mount();
		await screen.findByText("Director revision request");
		expect(screen.queryByRole("button", { name: "Mark resolved" })).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Needs further revision" }),
		).toBeNull();
	});
});
