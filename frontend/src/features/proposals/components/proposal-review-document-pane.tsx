import { PdfViewer, type PdfViewerRef } from "./pdf-viewer";
import type { ProposalComment } from "../comments.functions";

interface ProposalReviewDocumentPaneProps {
		viewerRef: React.RefObject<PdfViewerRef | null>;
		currentDocument?: { url: string };
		comments: ProposalComment[];
		canAnnotate: boolean;
		isTheaterMode: boolean;
		onAddComment: (
			content: string,
			annotation: {
				x: number;
				y: number;
				width: number;
				height: number;
				page: number;
			} | null,
		) => Promise<void>;
		onToggleTheaterMode: () => void;
}

export function ProposalReviewDocumentPane({
	viewerRef,
	currentDocument,
	comments,
	canAnnotate,
	isTheaterMode,
	onAddComment,
	onToggleTheaterMode,
}: ProposalReviewDocumentPaneProps) {
	return (
		<div
			className={`${isTheaterMode ? "lg:col-span-12 w-full" : "lg:col-span-8"} flex flex-col gap-4`}
		>
			<div className="bg-muted border border-border rounded-[12px] shadow-[0_1px_3px_0_var(--shadow-card)] overflow-hidden h-[844px]">
				{currentDocument ? (
					<PdfViewer
						ref={viewerRef}
						url={currentDocument.url}
						className="h-full"
						comments={comments}
						onAddComment={canAnnotate ? onAddComment : undefined}
						isTheaterMode={isTheaterMode}
						onToggleTheaterMode={onToggleTheaterMode}
					/>
				) : (
					<div className="flex items-center justify-center h-full text-muted-foreground">
						No document available
					</div>
				)}
			</div>
		</div>
	);
}
