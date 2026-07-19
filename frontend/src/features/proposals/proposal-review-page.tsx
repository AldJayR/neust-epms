import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { projectDetailsQueryOptions } from "@/features/projects/public";
import type { AuthUser } from "@/lib/auth";
import {
	getProposalCommentsFn,
	saveProposalCommentFn,
} from "./comments.functions";
import type { PdfViewerRef } from "./components/pdf-viewer";
import { ProposalReviewProvider } from "./components/proposal-review-context";
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
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
			queryClient.invalidateQueries({ queryKey: ["ret"] });
			queryClient.invalidateQueries({ queryKey: ["projects"] });

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
	const [isDownloading, setIsDownloading] = useState(false);
	const pdfViewerRef = useRef<PdfViewerRef>(null);

	const endorsement = data?.history.find(
		(historyItem) =>
			historyItem.status === "Endorsed" || historyItem.status === "Approved",
	);
	const hasEndorsement = Boolean(endorsement);
	const currentDoc =
		data?.attachments?.find(
			(attachment) => attachment.id === activeAttachmentId,
		) ?? data?.attachments?.[0];
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
			const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
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
		}) => {
			if (!currentDoc?.id) {
				throw new Error("No document is selected for comments.");
			}
			return saveProposalCommentFn({
				data: {
					proposalId,
					documentId: currentDoc.id,
					content: input.content,
					annotationJson: input.annotationJson,
				},
			});
		},
		onSuccess: () => {
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
				setActiveAttachmentId,
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

	if (!data || !contextValue) return null;

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
							comments={comments}
							canAnnotate={isReviewable}
							isTheaterMode={isTheaterMode}
							onAddComment={async (content, annotation) => {
								await addCommentMutation.mutateAsync({
									content,
									annotationJson: annotation,
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
