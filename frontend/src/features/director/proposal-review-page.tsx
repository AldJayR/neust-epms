import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Download, Loader2, MessageSquare } from "lucide-react";
import { useRef, useState } from "react";
import { PdfViewer, type PdfViewerRef } from "@/components/pdf-viewer";
import { Badge } from "@/components/ui/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AuthUser } from "@/lib/auth";
import {
	getProposalCommentsFn,
	saveProposalCommentFn,
} from "@/lib/comments.functions";
import {
	projectDetailsQueryOptions,
	reviewProposalFn,
} from "@/lib/dashboard.functions";
import { isRETChair } from "@/lib/permissions";

interface ProposalReviewPageProps {
	proposalId: string;
}

const formatBudget = (value: number) => `P${value.toLocaleString("en-PH")}`;

const formatReviewDate = (dateStr: string) => {
	try {
		return new Date(dateStr).toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	} catch {
		return dateStr;
	}
};

interface ProposalDetailsTabProps {
	data: {
		metadata: {
			leader: {
				name: string;
			};
			departmentCode: string;
			duration: string;
			budget: {
				neust: number;
			};
			moaLinked: string;
			sdgs?: string;
		};
		attachments?: {
			id: string;
			name: string;
			version: string;
		}[];
	};
	endorsement?: {
		status: string;
		actorName: string;
		date: string;
		comment?: string;
	};
	activeAttachmentId: string | null;
	setActiveAttachmentId: (id: string) => void;
	isReviewable: boolean;
	handleDeny: () => void;
	handleApprove: (comments?: string) => void;
	isPending: boolean;
	isRET?: boolean;
}

function ProposalDetailsTab({
	data,
	endorsement,
	activeAttachmentId,
	setActiveAttachmentId,
	isReviewable,
	handleDeny,
	handleApprove,
	isPending,
	isRET = false,
}: ProposalDetailsTabProps) {
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [commentsText, setCommentsText] = useState("");

	return (
		<CardContent className="p-0">
			<div className="p-5 space-y-4">
				<div className="flex justify-between items-center text-[14px]">
					<span className="text-[#737373] font-medium">Submitted by</span>
					<span className="text-black font-medium">
						{data.metadata.leader.name}
					</span>
				</div>
				<div className="flex justify-between items-center text-[14px]">
					<span className="text-[#737373] font-medium">Department</span>
					<span className="text-black font-medium">
						{data.metadata.departmentCode}
					</span>
				</div>
				<div className="flex justify-between items-center text-[14px]">
					<span className="text-[#737373] font-medium">Duration</span>
					<span className="text-black font-medium">
						{data.metadata.duration}
					</span>
				</div>
				<div className="flex justify-between items-center text-[14px]">
					<span className="text-[#737373] font-medium">Budget (NEUST)</span>
					<span className="text-black font-medium">
						{formatBudget(data.metadata.budget.neust)}
					</span>
				</div>
				<div className="flex justify-between items-center text-[14px]">
					<span className="text-[#737373] font-medium">SDGs</span>
					<span className="text-black font-medium">
						{data.metadata.sdgs ?? "None"}
					</span>
				</div>
			</div>

			<div className="px-5 py-2">
				<Separator className="bg-[#ebebeb]" />
			</div>

			{endorsement && (
				<>
					<div className="p-5 space-y-4">
						<h2 className="text-[14px] font-medium text-black">Endorsement</h2>
						<div className="rounded-[10px] border border-[#e5e5e5] p-3 space-y-1">
							<div className="flex items-center gap-3">
								<CheckCircle2 className="size-4 text-black" />
								<span className="text-[14px] font-medium text-black">
									{endorsement.status} by {endorsement.actorName}
								</span>
							</div>
							<div className="pl-7">
								<span className="text-[12px] text-[#737373] font-light">
									{formatReviewDate(endorsement.date)}
								</span>
							</div>
						</div>

						{endorsement.comment && (
							<>
								<h2 className="text-[14px] font-medium text-black mt-6">
									Remarks
								</h2>
								<div className="rounded-[10px] border border-[#e5e5e5] p-3">
									<p className="text-[14px] text-black font-light leading-relaxed">
										"{endorsement.comment}"
									</p>
								</div>
							</>
						)}
					</div>

					<div className="px-5 py-2">
						<Separator className="bg-[#ebebeb]" />
					</div>
				</>
			)}

			<div className="p-5 space-y-3">
				<h2 className="text-[14px] font-medium text-black">
					Attached documents
				</h2>
				<div className="space-y-1">
					{data.attachments?.map((file) => {
						const isActive =
							activeAttachmentId === null
								? data.attachments?.[0]?.id === file.id
								: activeAttachmentId === file.id;
						return (
							<button
								key={file.id}
								type="button"
								onClick={() => {
									setActiveAttachmentId(file.id);
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										setActiveAttachmentId(file.id);
									}
								}}
								className={`w-full px-3 py-2 rounded-[5px] flex flex-col gap-0.5 cursor-pointer text-left ${isActive ? "bg-[#caf1f6]" : "bg-transparent hover:bg-gray-50"}`}
							>
								<span
									className={`text-[12px] font-semibold ${isActive ? "text-[#0d74ce]" : "text-black"}`}
								>
									{file.name}
								</span>
								<span className="text-[11px] text-[#737373]">
									{file.version} {isActive && "· Currently Viewing"}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{isReviewable && isRET && (
				<>
					<div className="px-5 py-2">
						<Separator className="bg-[#ebebeb]" />
					</div>
					<div className="px-5 pt-2">
						<p className="text-[12px] text-[#737373] font-light leading-relaxed">
							Approving will forward this proposal to the Director/Admin for
							final review.
						</p>
					</div>
				</>
			)}

			{isReviewable && (
				<div className="p-5 flex gap-3">
					<Button
						variant="outline"
						className="flex-1 border border-[#e5e5e5] rounded-[10px] text-[#e54d2e] font-medium h-9 text-sm shadow-sm"
						onClick={handleDeny}
						disabled={isPending}
					>
						{isPending ? <Loader2 className="size-4 animate-spin" /> : "Return"}
					</Button>
					<Button
						className="flex-1 bg-[#14369c] text-white hover:bg-[#14369c]/90 rounded-[10px] font-medium h-9 text-sm shadow-sm cursor-pointer"
						onClick={() => {
							if (isRET) {
								setCommentsText("");
								setIsConfirmOpen(true);
							} else {
								handleApprove();
							}
						}}
						disabled={isPending}
					>
						{isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : isRET ? (
							"Endorse"
						) : (
							"Approve"
						)}
					</Button>
				</div>
			)}

			<Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
				<DialogContent className="sm:max-w-[425px] rounded-[12px] p-6 bg-white gap-4">
					<DialogHeader className="pb-2">
						<DialogTitle className="text-[16px] font-semibold text-[#11215a]">
							Endorse Proposal
						</DialogTitle>
						<DialogDescription className="text-sm text-[#737373] font-light">
							Please enter any final comments or remarks before endorsing this
							proposal (optional).
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<Textarea
							placeholder="Write final comments/remarks here (optional)..."
							value={commentsText}
							onChange={(e) => setCommentsText(e.target.value)}
							className="w-full min-h-[100px] border border-[#e5e5e5] rounded-[8px] p-3 text-sm focus-visible:ring-1 focus-visible:ring-[#14369c]"
						/>
					</div>

					<DialogFooter className="flex gap-3 mt-4">
						<Button
							variant="outline"
							className="flex-1 border border-[#e5e5e5] rounded-[10px] text-gray-500 font-medium h-9 text-sm shadow-sm cursor-pointer"
							onClick={() => setIsConfirmOpen(false)}
						>
							Cancel
						</Button>
						<Button
							className="flex-1 bg-[#14369c] text-white hover:bg-[#14369c]/90 rounded-[10px] font-medium h-9 text-sm shadow-sm cursor-pointer"
							onClick={() => {
								handleApprove(commentsText);
								setIsConfirmOpen(false);
							}}
							disabled={isPending}
						>
							{isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								"Endorse"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</CardContent>
	);
}

interface CommentsTabProps {
	comments: {
		commentId: string;
		user: {
			name: string;
			roleName: string;
		};
		createdAt: string;
		content: string;
		annotationJson: {
			page: number;
		} | null;
	}[];
	attachmentsCount: number;
	pdfViewerRef: React.RefObject<PdfViewerRef | null>;
}

function CommentsTab({
	comments,
	attachmentsCount,
	pdfViewerRef,
}: CommentsTabProps) {
	return (
		<div className="flex flex-col h-[750px] justify-between">
			{/* Comments List */}
			<div className="flex-1 overflow-y-auto p-5 space-y-4">
				{comments.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground gap-2">
						<MessageSquare className="size-8 text-gray-300 animate-pulse" />
						<p className="text-sm font-semibold">No comments yet</p>
						<p className="text-xs text-[#737373] font-light">
							Drag on the PDF page in comment mode to add remarks.
						</p>
					</div>
				) : (
					comments.map((comment) => (
						<button
							type="button"
							key={comment.commentId}
							className="w-full border border-[#ebebeb] rounded-xl p-4 bg-gray-50 hover:bg-gray-100/70 transition-colors space-y-2 cursor-pointer text-left block"
							onClick={() => {
								const annot = comment.annotationJson;
								if (annot?.page) {
									pdfViewerRef.current?.scrollToPage(annot.page);
								}
							}}
						>
							<div className="flex items-center justify-between gap-4">
								<div className="flex flex-col">
									<span className="text-xs font-semibold text-black">
										{comment.user.name}
									</span>
									<span className="text-[10px] text-[#737373]">
										{comment.user.roleName}
									</span>
								</div>
								<span className="text-[10px] text-[#999]">
									{new Date(comment.createdAt).toLocaleDateString()}
								</span>
							</div>
							<p className="text-xs text-[#333] leading-relaxed break-words">
								{comment.content}
							</p>
							{comment.annotationJson && (
								<span className="inline-block bg-[#14369c]/10 text-[#14369c] text-[9px] font-semibold px-2 py-0.5 rounded-[4px]">
									Page {comment.annotationJson.page}
								</span>
							)}
						</button>
					))
				)}
			</div>

			{/* Bottom panel */}
			<div className="border-t border-[#ebebeb] p-5 bg-white space-y-4">
				<div className="flex justify-between items-center text-[13px] text-[#737373]">
					<span>Attached Documents</span>
					<span className="font-semibold text-black">
						{attachmentsCount} files
					</span>
				</div>
			</div>
		</div>
	);
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
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
			queryClient.invalidateQueries({ queryKey: ["ret"] });
			queryClient.invalidateQueries({ queryKey: ["projects"] });
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

	const isReviewable =
		data?.status === "Endorsed" || data?.status === "Pending Review";

	const handleApprove = (comments?: string) => {
		const decision = data?.status === "Endorsed" ? "Approved" : "Endorsed";
		reviewMutation.mutate({
			proposalId,
			decision,
			comments:
				comments ||
				(decision === "Approved"
					? "Approved via review"
					: "Endorsed via review"),
		});
	};

	const handleDeny = () => {
		reviewMutation.mutate({
			proposalId,
			decision: "Returned",
			comments: "Returned for revision",
		});
	};

	return (
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
					<h1 className="text-2xl font-semibold text-[#11215a] tracking-tight">
						{isLoading ? "Loading..." : (data?.title ?? "Proposal")}
					</h1>
					{data?.status && (
						<Badge
							variant="outline"
							className="bg-white border-[#e5e5e5] text-[#737373] font-medium rounded-lg px-2.5 py-0.5 text-[12px]"
						>
							{data.status}
						</Badge>
					)}
				</div>
				{currentDoc && (
					<a href={currentDoc.url} target="_blank" rel="noopener noreferrer">
						<Button className="bg-[#14369c] text-white hover:bg-[#14369c]/90 rounded-[10px] h-9 px-4 gap-2 text-sm font-medium">
							<Download className="size-4" />
							Download
						</Button>
					</a>
				)}
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center h-[500px]">
					<Loader2 className="size-8 animate-spin text-[#11215a]" />
				</div>
			) : error ? (
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
						<div className="bg-[#f9f9f9] border border-[#ebebeb] rounded-[12px] shadow-[0_1px_3px_0_rgba(0,0,0,0.1)] overflow-hidden h-[844px]">
							{currentDoc ? (
								<PdfViewer
									ref={pdfViewerRef}
									url={currentDoc.url}
									className="h-full"
									proposalId={proposalId}
									documentId={currentDoc.id}
									comments={comments}
									onAddComment={async (content, annotation) => {
										await addCommentMutation.mutateAsync({
											content,
											annotationJson: annotation,
										});
									}}
									isTheaterMode={isTheaterMode}
									onToggleTheaterMode={() => setIsTheaterMode(!isTheaterMode)}
								/>
							) : (
								<div className="flex items-center justify-center h-full text-[#737373]">
									No document available
								</div>
							)}
						</div>
					</div>

					{/* Right Column: Details & Actions */}
					{!isTheaterMode && (
						<div className="lg:col-span-4 flex flex-col gap-6">
							<Tabs
								defaultValue="details"
								value={activeTab}
								onValueChange={(v) => setActiveTab(v as "details" | "comments")}
								className="w-full"
							>
								<Card className="border-[#ebebeb] shadow-[0_1px_3px_0_rgba(0,0,0,0.1)] rounded-[12px] overflow-hidden pt-2 pb-0 gap-0">
									<TabsList variant="line" className="w-full justify-start rounded-none gap-0 px-0">
										<div className="relative w-full flex">
											<TabsTrigger
												value="details"
												className="flex-1 py-3 text-xs font-semibold rounded-none cursor-pointer data-active:bg-transparent data-active:shadow-none data-active:text-[#14369c] after:!opacity-0"
											>
												Proposal Details
											</TabsTrigger>
											<TabsTrigger
												value="comments"
												className="flex-1 py-3 text-xs font-semibold rounded-none cursor-pointer data-active:bg-transparent data-active:shadow-none data-active:text-[#14369c] after:!opacity-0"
											>
												Comments
												{comments.length > 0 && (
													<span
														className={`px-1.5 py-0.5 rounded-full text-[10px] transition-colors ${activeTab === "comments" ? "bg-[#14369c] text-white" : "bg-gray-100 text-[#737373]"}`}
													>
														{comments.length}
													</span>
												)}
											</TabsTrigger>
											<div
												className={`absolute bottom-0 left-0 h-[2px] w-1/2 bg-[#14369c] transition-all duration-300 ease-in-out ${activeTab === "details" ? "translate-x-0" : "translate-x-full"}`}
											/>
										</div>
									</TabsList>

									<TabsContent value="details" className="mt-0">
										<ProposalDetailsTab
											data={data}
											endorsement={endorsement}
											activeAttachmentId={activeAttachmentId}
											setActiveAttachmentId={setActiveAttachmentId}
											isReviewable={isReviewable}
											handleDeny={handleDeny}
											handleApprove={handleApprove}
											isPending={reviewMutation.isPending}
											isRET={isRETChair(user)}
										/>
									</TabsContent>

									<TabsContent value="comments" className="mt-0">
										<CommentsTab
											comments={comments}
											attachmentsCount={data.attachments?.length ?? 0}
											pdfViewerRef={pdfViewerRef}
										/>
									</TabsContent>
								</Card>
							</Tabs>
						</div>
					)}
				</div>
			) : null}
		</div>
	);
}
