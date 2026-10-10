import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { invalidateWorkflowQueries } from "@/lib/workflow-queries";
import { getProposalCommentsFn } from "../comments.functions";
import {
	createRevisionRequestFn,
	getRevisionDocumentUrlFn,
	getRevisionRequestsFn,
	type RevisionRequest,
	reopenRevisionFn,
	revisionReadinessQueryOptions,
	saveRevisionResponseFn,
	verifyRevisionFn,
} from "../revisions.functions";
import { PdfViewer } from "./pdf-viewer";

function ResponseEditor({
	proposalId,
	request,
	disabled,
}: {
	proposalId: string;
	request: RevisionRequest;
	disabled: boolean;
}) {
	const client = useQueryClient();
	const [responseType, setResponseType] = useState<"Changed" | "Clarification">(
		request.draft?.responseType ??
			request.responses[0]?.responseType ??
			"Changed",
	);
	const [explanation, setExplanation] = useState(
		request.draft?.explanation ?? request.responses[0]?.explanation ?? "",
	);
	const [page, setPage] = useState(String(request.draft?.revisedPage ?? ""));
	const mutation = useMutation({
		mutationKey: ["revision-response", proposalId],
		mutationFn: () =>
			saveRevisionResponseFn({
				data: {
					proposalId,
					requestId: request.requestId,
					responseType,
					explanation,
					revisedPage: page ? Number(page) : null,
				},
			}),
		onSuccess: async () => {
			await client.invalidateQueries({
				queryKey: ["proposal-revisions", proposalId],
			});
			toast.success(
				"Response saved. The reviewer will verify it after resubmission.",
			);
		},
		onError: (error: Error) => toast.error(error.message),
	});
	return (
		<div className="space-y-3 border-t border-border pt-3">
			<label
				className="block text-xs font-medium"
				htmlFor={`type-${request.requestId}`}
			>
				Your response
			</label>
			<select
				id={`type-${request.requestId}`}
				value={responseType}
				disabled={disabled || mutation.isPending}
				onChange={(event) =>
					setResponseType(event.target.value as "Changed" | "Clarification")
				}
				className="w-full rounded-md border border-border bg-background p-2 text-sm"
			>
				<option value="Changed">Changed</option>
				<option value="Clarification">Clarification / change not made</option>
			</select>
			<Textarea
				aria-label="Explain how you handled the revision request"
				value={explanation}
				maxLength={10000}
				disabled={disabled || mutation.isPending}
				onChange={(event) => setExplanation(event.target.value)}
				placeholder="Explain what changed or why no change was made…"
			/>
			<label
				htmlFor={`page-${request.requestId}`}
				className="block text-xs text-muted-foreground"
			>
				Revised PDF page (optional)
			</label>
			<input
				id={`page-${request.requestId}`}
				type="number"
				min="1"
				step="1"
				value={page}
				disabled={disabled || mutation.isPending}
				onChange={(event) => setPage(event.target.value)}
				className="w-24 rounded-md border border-border bg-background p-2 text-sm"
			/>
			<p className="text-xs text-muted-foreground">
				{request.draft &&
				(request.draft.explanation !== explanation.trim() ||
					request.draft.responseType !== responseType ||
					request.draft.revisedPage !== (page ? Number(page) : null))
					? "Unsaved response changes. Click Save response to include them in your resubmission."
					: request.draft
						? "Response saved for this return. Save again if you make changes."
						: request.responses.length
							? "Previous response prefilled. Update or reconfirm it for this return."
							: "Save your response before resubmitting."}
			</p>
			<Button
				type="button"
				size="sm"
				disabled={
					disabled ||
					mutation.isPending ||
					!explanation.trim() ||
					(!!page && (!Number.isInteger(Number(page)) || Number(page) < 1))
				}
				onClick={() => mutation.mutate()}
			>
				{mutation.isPending ? "Saving…" : "Save response"}
			</Button>
		</div>
	);
}

function RevisionCard({
	proposalId,
	request,
	navigate,
	disabled,
}: {
	proposalId: string;
	request: RevisionRequest;
	navigate: (id: string, page?: number | null) => void;
	disabled: boolean;
}) {
	const client = useQueryClient();
	const [reason, setReason] = useState("");
	const [showReason, setShowReason] = useState(false);
	const latest = request.responses[0];
	const verify = useMutation({
		mutationFn: (decision: "Resolved" | "Further revision needed") =>
			request.canReopen
				? reopenRevisionFn({
						data: {
							proposalId,
							requestId: request.requestId,
							explanation: reason,
						},
					})
				: verifyRevisionFn({
						data: {
							proposalId,
							requestId: request.requestId,
							responseId: latest?.responseId ?? "",
							decision,
							explanation: reason,
						},
					}),
		onSuccess: async () => {
			await invalidateWorkflowQueries(client);
			setShowReason(false);
			toast.success(
				request.canReopen
					? "Revision request reopened."
					: "Verification recorded.",
			);
		},
		onError: (error: Error) => toast.error(error.message),
	});
	return (
		<article className="space-y-3 rounded-lg border border-border bg-card p-4">
			<div className="flex flex-wrap justify-between gap-2 text-xs">
				<span className="font-semibold">
					{request.reviewStage === "Endorsement" ? "Chair" : "Director"}{" "}
					revision request
				</span>
				<span className="rounded bg-muted px-2 py-1">{request.status}</span>
			</div>
			<p className="text-sm whitespace-pre-wrap break-words">
				{request.content}
			</p>
			<p className="text-xs text-muted-foreground">
				{request.createdBy}
				{request.version !== null && ` · Original v${request.version}`}
				{request.originalPage && ` · Page ${request.originalPage}`}
			</p>
			{request.documentId && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => {
						if (request.documentId)
							navigate(request.documentId, request.originalPage);
					}}
				>
					View original
				</Button>
			)}
			{latest && (
				<div className="space-y-2 rounded-md bg-muted p-3 text-xs">
					<p className="font-semibold">
						{latest.responseType === "Changed"
							? "Changed"
							: "Clarification / change not made"}{" "}
						· {latest.respondedBy}
					</p>
					<p className="whitespace-pre-wrap break-words">
						{latest.explanation}
					</p>
					{latest.documentId && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								if (latest.documentId)
									navigate(latest.documentId, latest.revisedPage);
							}}
						>
							View revision v{latest.version}
							{latest.revisedPage && ` · Page ${latest.revisedPage}`}
						</Button>
					)}
					{latest.verifications.map((verification) => (
						<p
							key={`${verification.verifiedAt}-${verification.verifiedBy}`}
							className="border-t border-border pt-2"
						>
							{verification.decision} · {verification.verifiedBy}
							{verification.explanation && ` — ${verification.explanation}`}
						</p>
					))}
				</div>
			)}
			{request.responses.length > 1 && (
				<details className="text-xs">
					<summary className="cursor-pointer">
						Earlier responses ({request.responses.length - 1})
					</summary>
					{request.responses.slice(1).map((response) => (
						<div
							key={response.responseId}
							className="space-y-2 border-t border-border py-3"
						>
							<p>
								v{response.version} · {response.respondedBy}
							</p>
							<p className="whitespace-pre-wrap">{response.explanation}</p>
							{response.documentId && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										if (response.documentId)
											navigate(response.documentId, response.revisedPage);
									}}
								>
									View revision
								</Button>
							)}
							{response.verifications.map((verification) => (
								<p key={verification.verifiedAt}>
									{verification.decision} · {verification.verifiedBy}:{" "}
									{verification.explanation}
								</p>
							))}
						</div>
					))}
				</details>
			)}
			{request.reopenings.map((reopening) => (
				<div
					key={reopening.reopeningId}
					className="space-y-2 rounded-md border border-border p-3 text-xs"
				>
					<p className="font-semibold">
						Reopened while reviewing v{reopening.version} ·{" "}
						{reopening.reopenedBy}
					</p>
					<p className="whitespace-pre-wrap break-words">
						{reopening.explanation}
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => navigate(reopening.documentId)}
					>
						View revision v{reopening.version}
					</Button>
				</div>
			))}
			{request.canRespond && (
				<ResponseEditor
					key={request.requestId}
					proposalId={proposalId}
					request={request}
					disabled={disabled}
				/>
			)}
			{(request.canVerify || request.canReopen) && (
				<div className="space-y-2">
					<div className="flex flex-wrap gap-2">
						{request.canVerify && (
							<Button
								type="button"
								size="sm"
								disabled={verify.isPending}
								onClick={() => verify.mutate("Resolved")}
							>
								Mark resolved
							</Button>
						)}
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={verify.isPending}
							onClick={() => setShowReason(!showReason)}
						>
							{request.canReopen ? "Reopen request" : "Needs further revision"}
						</Button>
					</div>
					{showReason && (
						<>
							<Textarea
								aria-label={
									request.canReopen
										? "Explain why this request needs reopening"
										: "Explain what still needs revision"
								}
								value={reason}
								onChange={(event) => setReason(event.target.value)}
								placeholder="Explain what still needs revision…"
							/>
							<Button
								type="button"
								size="sm"
								disabled={verify.isPending || !reason.trim()}
								onClick={() => verify.mutate("Further revision needed")}
							>
								{request.canReopen ? "Confirm reopening" : "Save verification"}
							</Button>
						</>
					)}
				</div>
			)}
		</article>
	);
}

export function RevisionWorkspace({
	proposalId,
	onNavigate,
	disabled = false,
}: {
	proposalId: string;
	onNavigate?: (id: string, page?: number | null) => void;
	disabled?: boolean;
}) {
	const [page, setPage] = useState(1);
	const [status, setStatus] = useState("Active");
	const [stage, setStage] = useState("");
	const [general, setGeneral] = useState("");
	const [preview, setPreview] = useState<{
		id: string;
		page?: number | null;
	} | null>(null);
	const client = useQueryClient();
	const { data: readiness } = useQuery(
		revisionReadinessQueryOptions(proposalId),
	);
	const { data, isLoading, error } = useQuery({
		queryKey: [
			"proposal-revisions",
			proposalId,
			"requests",
			page,
			status,
			stage,
		],
		queryFn: () =>
			getRevisionRequestsFn({
				data: {
					proposalId,
					page,
					...(status !== "All" ? { status } : {}),
					...(stage ? { stage } : {}),
				},
			}),
	});
	const previewQuery = useQuery({
		queryKey: ["revision-pdf-url", proposalId, preview?.id],
		queryFn: () =>
			getRevisionDocumentUrlFn({
				data: { proposalId, documentId: preview?.id ?? "" },
			}),
		enabled: !!preview,
	});
	const previewComments = useQuery({
		queryKey: ["proposal-comments", preview?.id],
		queryFn: () =>
			getProposalCommentsFn({
				data: { proposalId, documentId: preview?.id ?? "" },
			}),
		enabled: !!preview,
	});
	const create = useMutation({
		mutationFn: () =>
			createRevisionRequestFn({ data: { proposalId, content: general } }),
		onSuccess: async () => {
			setGeneral("");
			await client.invalidateQueries({
				queryKey: ["proposal-revisions", proposalId],
			});
		},
		onError: (failure: Error) => toast.error(failure.message),
	});
	const navigate =
		onNavigate ??
		((id: string, targetPage?: number | null) =>
			setPreview({ id, page: targetPage }));
	const items =
		data?.items.filter(
			(item) => status !== "Active" || item.status !== "Resolved",
		) ?? [];
	return (
		<div className="space-y-4">
			{readiness && (
				<div className="rounded-lg border border-border p-3 text-xs space-y-1">
					<p className="font-semibold">
						{readiness.canRespond ? "Revision readiness" : "Revision review"}
					</p>
					<p>
						{readiness.outstanding} outstanding requests
						{readiness.canRespond && ` · ${readiness.answered} responses saved`}
					</p>
					{readiness.canRespond ? (
						<p>
							{readiness.revisedDocumentReady
								? "✓ Revised PDF uploaded"
								: "Upload a revised PDF after the return before resubmitting."}
						</p>
					) : (
						readiness.stage && (
							<p>
								{readiness.stageOutstanding} unresolved at your stage.
								Other-stage feedback stays with its owning reviewer.
							</p>
						)
					)}
				</div>
			)}
			<div className="flex flex-wrap gap-2">
				<select
					aria-label="Filter revision status"
					value={status}
					onChange={(event) => {
						setStatus(event.target.value);
						setPage(1);
					}}
					className="max-w-full rounded-md border border-border bg-background p-2 text-xs"
				>
					{[
						"Active",
						"All",
						"Response needed",
						"Awaiting verification",
						"Further revision needed",
						"Resolved",
					].map((value) => (
						<option key={value}>{value}</option>
					))}
				</select>
				<select
					aria-label="Filter review stage"
					value={stage}
					onChange={(event) => {
						setStage(event.target.value);
						setPage(1);
					}}
					className="rounded-md border border-border bg-background p-2 text-xs"
				>
					<option value="">All stages</option>
					<option value="Endorsement">Chair</option>
					<option value="Approval">Director</option>
				</select>
			</div>
			{readiness?.canReview && (
				<details className="text-xs">
					<summary className="cursor-pointer">
						Add a general revision request
					</summary>
					<div className="space-y-2 py-2">
						<Textarea
							aria-label="General revision request"
							value={general}
							onChange={(event) => setGeneral(event.target.value)}
							placeholder="Describe what needs revision…"
						/>
						<Button
							type="button"
							size="sm"
							disabled={create.isPending || !general.trim()}
							onClick={() => create.mutate()}
						>
							Add request
						</Button>
					</div>
				</details>
			)}
			{isLoading && (
				<p role="status" className="text-sm">
					Loading revision requests…
				</p>
			)}
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error.message}
				</p>
			)}
			{!isLoading && !error && !items.length && (
				<p className="text-sm text-muted-foreground">
					No revision requests match this view.
				</p>
			)}
			{items.map((request) => (
				<RevisionCard
					key={request.requestId}
					proposalId={proposalId}
					request={request}
					navigate={navigate}
					disabled={disabled}
				/>
			))}
			{data && data.total > data.limit && (
				<div className="flex items-center justify-between gap-2 text-xs">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => setPage(page - 1)}
					>
						Previous
					</Button>
					<span>
						Page {page} of {Math.ceil(data.total / data.limit)}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={page * data.limit >= data.total}
						onClick={() => setPage(page + 1)}
					>
						Next
					</Button>
				</div>
			)}
			<Dialog
				open={!!preview}
				onOpenChange={(open) => {
					if (!open) setPreview(null);
				}}
			>
				<DialogContent className="!max-w-[1000px] h-[85dvh] flex flex-col">
					<DialogHeader>
						<DialogTitle>Proposal document</DialogTitle>
						<DialogDescription>
							Original feedback remains attached to its original PDF version.
						</DialogDescription>
					</DialogHeader>
					<div className="min-h-0 flex-1">
						{previewQuery.data ? (
							<PdfViewer
								key={`${preview?.id}-${preview?.page}`}
								url={previewQuery.data.url}
								initialPage={preview?.page ?? undefined}
								comments={previewComments.data ?? []}
							/>
						) : (
							<p role={previewQuery.error ? "alert" : "status"}>
								{previewQuery.error?.message ?? "Loading PDF…"}
							</p>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
