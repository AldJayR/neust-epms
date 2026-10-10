import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toStableDate } from "@/lib/utils";
import type { ProposalComment } from "../comments.functions";
import { createRevisionRequestFn } from "../revisions.functions";
import type { PdfViewerRef } from "./pdf-viewer";
import { useProposalReview } from "./proposal-review-context";

interface CommentsTabProps {
	comments: ProposalComment[];
	attachmentsCount: number;
	pdfViewerRef: React.RefObject<PdfViewerRef | null>;
}

export function CommentsTab({
	comments,
	attachmentsCount,
	pdfViewerRef,
}: CommentsTabProps) {
	const { data, isReviewable } = useProposalReview();
	const client = useQueryClient();
	const promote = useMutation({
		mutationFn: (commentId: string) =>
			createRevisionRequestFn({ data: { proposalId: data.id, commentId } }),
		onSuccess: async () => {
			await client.invalidateQueries({
				queryKey: ["proposal-revisions", data.id],
			});
			await client.invalidateQueries({ queryKey: ["proposal-comments"] });
			toast.success("Comment added to revision requests.");
		},
		onError: (error: Error) => toast.error(error.message),
	});
	return (
		<div className="flex flex-col border-t border-border">
			{/* Comments List */}
			<div className="space-y-4 py-4">
				<h3 className="text-sm font-semibold">Comments on the selected PDF</h3>
				{comments.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground gap-2">
						<MessageSquare className="size-8 text-gray-300 animate-pulse dark:text-muted-foreground" />
						<p className="text-sm font-semibold">No comments yet</p>
						<p className="text-xs text-muted-foreground font-light">
							{isReviewable
								? "Select the current proposal PDF and use comment mode to add feedback."
								: "Earlier feedback stays attached to its original document version."}
						</p>
					</div>
				) : (
					comments.map((comment) => (
						<article
							key={comment.commentId}
							className="w-full border border-border rounded-xl p-4 bg-gray-50 hover:bg-gray-100/70 transition-colors space-y-2 cursor-pointer text-left block dark:bg-card dark:hover:bg-muted/70"
						>
							<div className="flex items-center justify-between gap-4">
								<div className="flex flex-col">
									<span className="text-xs font-semibold text-black dark:text-foreground">
										{comment.user.name}
									</span>
									<span className="text-3xs text-muted-foreground">
										{comment.user.roleName}
									</span>
								</div>
								<span className="text-3xs text-muted-foreground/60">
									{toStableDate(comment.createdAt).toLocaleDateString("en-US", {
										timeZone: "UTC",
									})}
								</span>
							</div>
							<p className="text-xs text-foreground/80 leading-relaxed break-words">
								{comment.content}
							</p>
							<p className="text-xs font-semibold">
								{comment.classification ?? "Remark"}
							</p>
							{comment.annotationJson && (
								<button
									type="button"
									onClick={() =>
										pdfViewerRef.current?.scrollToPage(
											comment.annotationJson?.page ?? 1,
										)
									}
									className="inline-block bg-brand-primary/10 text-brand-primary text-[9px] font-semibold px-2 py-0.5 rounded-[4px]"
								>
									Page {comment.annotationJson.page}
								</button>
							)}
							{isReviewable &&
								comment.classification !== "Revision required" && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={promote.isPending}
										onClick={() => promote.mutate(comment.commentId)}
									>
										Require revision
									</Button>
								)}
						</article>
					))
				)}
			</div>

			{/* Bottom panel */}
			<div className="border-t border-border p-5 bg-background space-y-4">
				<div className="flex justify-between items-center text-sm text-muted-foreground">
					<span>Attached Documents</span>
					<span className="font-semibold text-black dark:text-foreground">
						{attachmentsCount} files
					</span>
				</div>
			</div>
		</div>
	);
}
