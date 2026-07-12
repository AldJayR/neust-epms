import { MessageSquare } from "lucide-react";
import type { PdfViewerRef } from "./pdf-viewer";

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

export function CommentsTab({
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
						<p className="text-xs text-muted-foreground font-light">
							Drag on the PDF page in comment mode to add remarks.
						</p>
					</div>
				) : (
					comments.map((comment) => (
						<button
							type="button"
							key={comment.commentId}
							className="w-full border border-border rounded-xl p-4 bg-gray-50 hover:bg-gray-100/70 transition-colors space-y-2 cursor-pointer text-left block"
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
									<span className="text-3xs text-muted-foreground">
										{comment.user.roleName}
									</span>
								</div>
								<span className="text-3xs text-muted-foreground/60">
									{new Date(comment.createdAt).toLocaleDateString()}
								</span>
							</div>
							<p className="text-xs text-foreground/80 leading-relaxed break-words">
								{comment.content}
							</p>
							{comment.annotationJson && (
								<span className="inline-block bg-brand-primary/10 text-brand-primary text-[9px] font-semibold px-2 py-0.5 rounded-[4px]">
									Page {comment.annotationJson.page}
								</span>
							)}
						</button>
					))
				)}
			</div>

			{/* Bottom panel */}
			<div className="border-t border-border p-5 bg-background space-y-4">
				<div className="flex justify-between items-center text-sm text-muted-foreground">
					<span>Attached Documents</span>
					<span className="font-semibold text-black">
						{attachmentsCount} files
					</span>
				</div>
			</div>
		</div>
	);
}
