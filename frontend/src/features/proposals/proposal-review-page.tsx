import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { projectDetailsQueryOptions } from "@/features/projects/public";
import type { AuthUser } from "@/lib/auth";
import { invalidateWorkflowQueries } from "@/lib/workflow-queries";
import {
	getProposalCommentsFn,
	saveProposalCommentFn,
} from "./comments.functions";
import type { PdfViewerRef } from "./components/pdf-viewer";
import {
	INSTITUTIONAL_APPROVAL_DOCUMENT_ID,
	ProposalReviewProvider,
	SPECIAL_ORDERS_DOCUMENT_ID,
} from "./components/proposal-review-context";
import { ProposalReviewDocumentPane } from "./components/proposal-review-document-pane";
import { ProposalReviewHeader } from "./components/proposal-review-header";
import { ProposalReviewSidebar } from "./components/proposal-review-sidebar";
import { ProposalReviewSkeleton } from "./components/proposal-review-skeleton";
import { downloadAnnotatedProposalFn, reviewProposalFn } from "./functions";
import {
	canReviewProposal,
	getDefaultReviewComment,
	getReviewDecision,
	shouldBlockReviewAction,
} from "./helpers/proposal-review-helpers";
import { ProposalLifecycleStepper } from "./proposal-lifecycle-stepper";
import { revisionReadinessQueryOptions } from "./revisions.functions";

interface ProposalReviewPageProps {
	proposalId: string;
}

export function ProposalReviewPage({ proposalId }: ProposalReviewPageProps) {
	const user = useRouterState({
		select: (state) => {
			const authMatch = state.matches.find(
				(match) => match.routeId === "/_authenticated",
			);
			return (
				(authMatch?.context as { user: AuthUser | null } | undefined)?.user ??
				null
			);
		},
	});

	const queryClient = useQueryClient();
	const revisionQuery = useQuery(revisionReadinessQueryOptions(proposalId));
	const { data, isLoading, error } = useQuery(
		projectDetailsQueryOptions(proposalId),
	);

	const reviewMutation = useMutation({
		mutationFn: (input: {
			proposalId: string;
			decision: "Endorsed" | "Approved" | "Returned" | "Rejected";
			comments?: string;
		}) => reviewProposalFn({ data: input }),
		onSuccess: (_result, variables) => {
			void invalidateWorkflowQueries(queryClient);
			queryClient.invalidateQueries({ queryKey: ["action-center"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
			queryClient.invalidateQueries({ queryKey: ["ret"] });
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["faculty", "proposals"] });
			queryClient.invalidateQueries({ queryKey: ["faculty", "projects"] });
			queryClient.invalidateQueries({
				queryKey: ["proposal", "edit", proposalId],
			});
			queryClient.invalidateQueries({
				queryKey: ["project-readiness", proposalId],
			});
			queryClient.invalidateQueries({
				queryKey: ["project-derived-state", proposalId],
			});
			queryClient.invalidateQueries({ queryKey: ["analytics"] });

			if (variables.decision === "Rejected") {
				toast.success("Proposal has been rejected successfully.");
			} else if (variables.decision === "Approved") {
				toast.success("Proposal has been approved successfully.");
			} else if (variables.decision === "Endorsed") {
				toast.success("Proposal has been endorsed successfully.");
			} else if (variables.decision === "Returned") {
				toast.success("Proposal has been returned for revision.");
			}
		},
		onError: (reviewError: Error) => {
			toast.error(reviewError.message || "Failed to process proposal review.");
		},
	});

	const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(
		null,
	);
	const [isTheaterMode, setIsTheaterMode] = useState(false);
	const [initialPage, setInitialPage] = useState<number | undefined>();
	const [isDownloading, setIsDownloading] = useState(false);
	const pdfViewerRef = useRef<PdfViewerRef>(null);

	const endorsement = data?.history.find(
		(historyItem) =>
			historyItem.status === "Endorsed" || historyItem.status === "Approved",
	);
	const hasEndorsement =
		data?.status !== "Pending Review" && Boolean(endorsement);
	const currentDoc =
		activeAttachmentId === SPECIAL_ORDERS_DOCUMENT_ID
			? undefined
			: activeAttachmentId === INSTITUTIONAL_APPROVAL_DOCUMENT_ID &&
					data?.institutionalApprovalDocUrl
				? { id: undefined, url: data.institutionalApprovalDocUrl }
				: (data?.attachments?.find(
						(attachment) => attachment.id === activeAttachmentId,
					) ?? data?.attachments?.[0]);
	const userRole = user?.roleName ?? "";
	const isRET = userRole === "RET Chair";
	const isDirector = userRole === "Director";

	const handleDownloadAnnotated = async () => {
		if (!currentDoc?.id) return;

		setIsDownloading(true);
		try {
			const result = await downloadAnnotatedProposalFn({
				data: { proposalId, documentId: currentDoc.id },
			});
			const binary = atob(result.base64);
			const bytes = Uint8Array.from(binary, (character) =>
				character.charCodeAt(0),
			);
			const blob = new Blob([bytes], { type: "application/pdf" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = result.fileName;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			toast.success("Annotated proposal downloaded.");
		} catch (downloadError) {
			toast.error(
				downloadError instanceof Error
					? downloadError.message
					: "Failed to download annotated proposal.",
			);
		} finally {
			setIsDownloading(false);
		}
	};

	const { data: comments = [] } = useQuery({
		queryKey: ["proposal-comments", currentDoc?.id],
		queryFn: () =>
			getProposalCommentsFn({
				data: { proposalId, documentId: currentDoc?.id ?? "" },
			}),
		enabled: !!currentDoc?.id,
	});

	const addCommentMutation = useMutation({
		mutationFn: (input: {
			content: string;
			annotationJson: {
				x: number;
				y: number;
				width: number;
				height: number;
				page: number;
			} | null;
			classification?: "Remark" | "Revision required";
		}) => {
			if (!currentDoc?.id) {
				throw new Error("No document is selected for comments.");
			}
			return saveProposalCommentFn({
				data: {
					proposalId,
					documentId: currentDoc.id,
					content: input.content,
					classification: input.classification ?? "Remark",
					annotationJson: input.annotationJson,
				},
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["proposal-revisions", proposalId],
			});
			queryClient.invalidateQueries({
				queryKey: ["proposal-comments", currentDoc?.id],
			});
		},
	});

	const isReviewable = canReviewProposal({
		role: userRole,
		status: data?.status,
		bypassedRetChair: data?.bypassedRetChair ?? false,
		hasEndorsement,
	});

	const handleApprove = async (commentsText?: string) => {
		if (
			shouldBlockReviewAction(
				userRole,
				data?.bypassedRetChair ?? false,
				hasEndorsement,
			)
		) {
			return;
		}
		const decision = getReviewDecision(isDirector ? "Director" : "RET Chair");
		await reviewMutation.mutateAsync({
			proposalId,
			decision,
			comments: commentsText || getDefaultReviewComment(decision),
		});
	};

	const handleDeny = async (commentsText?: string) => {
		if (
			shouldBlockReviewAction(
				userRole,
				data?.bypassedRetChair ?? false,
				hasEndorsement,
			)
		) {
			return;
		}
		await reviewMutation.mutateAsync({
			proposalId,
			decision: "Returned",
			comments: commentsText || "Returned for revision",
		});
	};

	const handleReject = async (commentsText?: string) => {
		if (
			shouldBlockReviewAction(
				userRole,
				data?.bypassedRetChair ?? false,
				hasEndorsement,
			)
		) {
			return;
		}
		await reviewMutation.mutateAsync({
			proposalId,
			decision: "Rejected",
			comments: commentsText || "Proposal rejected",
		});
	};

	const contextValue = data
		? {
				data,
				endorsement,
				activeAttachmentId,
				setActiveAttachmentId: (id: string) => {
					setInitialPage(undefined);
					setActiveAttachmentId(id);
				},
				onNavigateDocument: (id: string, page?: number | null) => {
					setInitialPage(page ?? undefined);
					setActiveAttachmentId(id);
				},
				stageOutstanding: revisionQuery.data?.stageOutstanding ?? 0,
				revisionsLoading: revisionQuery.isPending || revisionQuery.isError,
				isReviewable,
				handleDeny,
				handleReject,
				handleApprove,
				isPending: reviewMutation.isPending,
				isRET,
				bypassedRetChair: data.bypassedRetChair,
			}
		: null;

	if (isLoading) {
		return <ProposalReviewSkeleton />;
	}

	if (error) {
		return (
			<div role="alert" className="flex items-center justify-center h-[500px]">
				<p className="text-muted-foreground">
					Failed to load proposal details. {error.message}
				</p>
			</div>
		);
	}

	if (!data || !contextValue) return <p>Proposal not found.</p>;

	return (
		<ProposalReviewProvider value={contextValue}>
			<div className="flex flex-col gap-6">
				<ProposalReviewHeader
					proposalId={proposalId}
					title={data.title}
					status={data.status}
					currentDocument={currentDoc}
					isDownloading={isDownloading}
					onDownloadAnnotated={handleDownloadAnnotated}
					isDirector={isDirector}
				/>

				<div className="bg-card border border-border rounded-xl p-6 shadow-sm">
					<ProposalLifecycleStepper currentStatus={data.status} />
				</div>

				{error ? (
					<div className="flex items-center justify-center h-[500px]">
						<p className="text-muted-foreground">
							Failed to load proposal details.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
						<ProposalReviewDocumentPane
							viewerRef={pdfViewerRef}
							currentDocument={currentDoc}
							initialPage={initialPage}
							specialOrderMembers={
								activeAttachmentId === SPECIAL_ORDERS_DOCUMENT_ID
									? data.members
									: undefined
							}
							comments={comments}
							canAnnotate={
								isReviewable &&
								!!currentDoc?.id &&
								currentDoc.id === revisionQuery.data?.latestDocumentId
							}
							isTheaterMode={isTheaterMode}
							onAddComment={async (content, annotation, classification) => {
								await addCommentMutation.mutateAsync({
									content,
									annotationJson: annotation,
									classification: classification ?? "Remark",
								});
							}}
							onToggleTheaterMode={() =>
								setIsTheaterMode((currentMode) => !currentMode)
							}
						/>
						{!isTheaterMode && (
							<ProposalReviewSidebar
								comments={comments}
								attachmentsCount={data.attachments?.length ?? 0}
								viewerRef={pdfViewerRef}
							/>
						)}
					</div>
				)}
			</div>
		</ProposalReviewProvider>
	);
}
