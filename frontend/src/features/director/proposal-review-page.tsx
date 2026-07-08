import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { BrandButton } from "@/components/custom/brand-button";
import { PdfViewer, type PdfViewerRef } from "@/components/pdf-viewer";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProposalLifecycleStepper } from "@/features/proposals/proposal-lifecycle-stepper";
import type { AuthUser } from "@/lib/auth";
import {
	getProposalCommentsFn,
	saveProposalCommentFn,
} from "@/lib/comments.functions";
import {
	type ProjectDetailsResponse,
	type ProjectHistoryItem,
	projectDetailsQueryOptions,
	reviewProposalFn,
} from "@/lib/dashboard.functions";
import { isDirector, isRETChair } from "@/lib/permissions";
import { CommentsTab } from "./components/comments-tab";
import { ProposalDetailsTab } from "./components/proposal-details-tab";
import { ProposalReviewSkeleton } from "./components/proposal-review-skeleton";

export interface ProposalReviewContextValue {
	data: ProjectDetailsResponse;
	endorsement: ProjectHistoryItem | undefined;
	activeAttachmentId: string | null;
	setActiveAttachmentId: (id: string) => void;
	isReviewable: boolean;
	handleDeny: (comments?: string) => Promise<void> | void;
	handleReject: (comments?: string) => Promise<void> | void;
	handleApprove: (comments?: string) => Promise<void> | void;
	isPending: boolean;
	isRET: boolean;
	bypassedRetChair: boolean;
}

const ProposalReviewContext = createContext<ProposalReviewContextValue | null>(null);

export function useProposalReview() {
	const context = useContext(ProposalReviewContext);
	if (!context) {
		throw new Error(
			"useProposalReview must be used within a ProposalReviewProvider",
		);
	}
	return context;
}

interface ProposalReviewPageProps {
	proposalId: string;
}

export function ProposalReviewPage({ proposalId }: ProposalReviewPageProps) {
	const user = useRouterState({
		select: (s) => {
			const authMatch = s.matches.find((m) => m.routeId === "/_authenticated");
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
		onSuccess: (data, variables) => {
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
		onError: (error: Error) => {
			toast.error(error.message || "Failed to process proposal review.");
		},
	});

	const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(
		null,
	);

	const [isTheaterMode, setIsTheaterMode] = useState(false);
	const [activeTab, setActiveTab] = useState<"details" | "comments">("details");
	const pdfViewerRef = useRef<PdfViewerRef>(null);


	const endorsement = data?.history.find(
		(h) => h.status === "Endorsed" || h.status === "Approved",
	);

	const currentDoc =
		data?.attachments?.find((a) => a.id === activeAttachmentId) ??
		data?.attachments?.[0];

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

	const isReviewer = isDirector(user) || isRETChair(user);

	const isReviewable =
		isReviewer &&
		(data?.status === "Endorsed" || data?.status === "Pending Review") &&
		!(isRETChair(user) && (data?.bypassedRetChair || endorsement));

	const canAnnotate =
		isReviewer &&
		(data?.status === "Endorsed" || data?.status === "Pending Review") &&
		!(isRETChair(user) && (data?.bypassedRetChair || endorsement));

	const handleApprove = async (comments?: string) => {
		if (isRETChair(user) && (data?.bypassedRetChair || endorsement)) {
			return;
		}
		const decision = data?.status === "Endorsed" ? "Approved" : "Endorsed";
		await reviewMutation.mutateAsync({
			proposalId,
			decision,
			comments:
				comments ||
				(decision === "Approved"
					? "Approved via review"
					: "Endorsed via review"),
		});
	};

	const handleDeny = async (comments?: string) => {
		if (isRETChair(user) && (data?.bypassedRetChair || endorsement)) {
			return;
		}
		await reviewMutation.mutateAsync({
			proposalId,
			decision: "Returned",
			comments: comments || "Returned for revision",
		});
	};

	const handleReject = async (comments?: string) => {
		if (isRETChair(user) && (data?.bypassedRetChair || endorsement)) {
			return;
		}
		await reviewMutation.mutateAsync({
			proposalId,
			decision: "Rejected",
			comments: comments || "Proposal rejected",
		});
	};

	const contextValue = useMemo(() => {
		if (!data) return null;
		return {
			data,
			endorsement,
			activeAttachmentId,
			setActiveAttachmentId,
			isReviewable,
			handleDeny,
			handleReject,
			handleApprove,
			isPending: reviewMutation.isPending,
			isRET: isRETChair(user),
			bypassedRetChair: data.bypassedRetChair,
		};
	}, [
		data,
		endorsement,
		activeAttachmentId,
		isReviewable,
		handleDeny,
		handleReject,
		handleApprove,
		reviewMutation.isPending,
		user,
	]);

	if (isLoading) {
		return <ProposalReviewSkeleton />;
	}

	if (!contextValue) return null;

	return (
		<ProposalReviewContext.Provider value={contextValue}>
			<div className="flex flex-col gap-6">
				{/* Breadcrumb */}
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink
								render={
									<Link to="/dashboard" search={{ page: 1, pageSize: 10 }} />
								}
							>
								Dashboard
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink
								render={
									<Link
										to="/projects/$projectId"
										params={{ projectId: proposalId }}
									/>
								}
							>
								Project Details
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>Proposal Review</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>

				{/* Page Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<h1 className="text-2xl font-semibold text-heading tracking-tight">
							{data?.title ?? "Proposal"}
						</h1>
						{data?.status && (
							<StatusBadge status={data.status} variant="outline" />
						)}
					</div>
					{currentDoc && (
						<a href={currentDoc.url} target="_blank" rel="noopener noreferrer">
							<BrandButton className="h-9 px-4 gap-2 text-sm font-medium">
								<Download className="size-4" />
								Download
							</BrandButton>
						</a>
					)}
				</div>

				{data?.status && (
					<div className="bg-card border border-border rounded-xl p-6 shadow-sm">
						<ProposalLifecycleStepper currentStatus={data.status} />
					</div>
				)}

				{error ? (
					<div className="flex items-center justify-center h-[500px]">
						<p className="text-muted-foreground">
							Failed to load proposal details.
						</p>
					</div>
				) : data ? (
					/* Main Content Layout */
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
						{/* Left Column: PDF Viewer */}
						<div
							className={`${isTheaterMode ? "lg:col-span-12 w-full" : "lg:col-span-8"} flex flex-col gap-4`}
						>
							<div className="bg-muted border border-border rounded-[12px] shadow-[0_1px_3px_0_var(--shadow-card)] overflow-hidden h-[844px]">
								{currentDoc ? (
									<PdfViewer
										ref={pdfViewerRef}
										url={currentDoc.url}
										className="h-full"
										comments={comments}
										onAddComment={
											canAnnotate
												? async (content, annotation) => {
														await addCommentMutation.mutateAsync({
															content,
															annotationJson: annotation,
														});
													}
												: undefined
										}
										isTheaterMode={isTheaterMode}
										onToggleTheaterMode={() => setIsTheaterMode(!isTheaterMode)}
									/>
								) : (
									<div className="flex items-center justify-center h-full text-muted-foreground">
										No document available
									</div>
								)}
							</div>
						</div>

						{/* Right Column: Details & Actions */}
						{!isTheaterMode && (
							<div className="lg:col-span-4 flex flex-col gap-6">
								<Card className="border-border shadow-[0_1px_3px_0_var(--shadow-card)] rounded-[12px] overflow-hidden pt-2 pb-0 gap-0">
									<Tabs
										defaultValue="details"
										value={activeTab}
										onValueChange={(v) => setActiveTab(v as "details" | "comments")}
										className="w-full"
									>
										<TabsList
											variant="line"
											className="w-full justify-start rounded-none gap-0 px-0"
										>
											<div className="relative w-full flex">
												<TabsTrigger
													value="details"
													className="flex-1 py-3 text-xs font-semibold rounded-none cursor-pointer data-active:bg-transparent data-active:shadow-none data-active:text-brand-primary after:!opacity-0"
												>
													Proposal Details
												</TabsTrigger>
												<TabsTrigger
													value="comments"
													className="flex-1 py-3 text-xs font-semibold rounded-none cursor-pointer data-active:bg-transparent data-active:shadow-none data-active:text-brand-primary after:!opacity-0"
												>
													Comments
													{comments.length > 0 && (
														<span
															className={`px-1.5 py-0.5 rounded-full text-[10px] transition-colors ${activeTab === "comments" ? "bg-brand-primary text-white" : "bg-gray-100 text-muted-foreground"}`}
														>
															{comments.length}
														</span>
													)}
												</TabsTrigger>
												<div
													className={`absolute bottom-0 left-0 h-[2px] w-1/2 bg-brand-primary transition-all duration-300 ease-in-out ${activeTab === "details" ? "translate-x-0" : "translate-x-full"}`}
												/>
											</div>
										</TabsList>

										<TabsContent value="details" className="mt-0">
											<ProposalDetailsTab />
										</TabsContent>

										<TabsContent value="comments" className="mt-0">
											<CommentsTab
												comments={comments}
												attachmentsCount={data.attachments?.length ?? 0}
												pdfViewerRef={pdfViewerRef}
											/>
										</TabsContent>
									</Tabs>
								</Card>
							</div>
						)}
					</div>
				) : null}
			</div>
		</ProposalReviewContext.Provider>
	);
}
