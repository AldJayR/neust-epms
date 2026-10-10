import type { ProjectMember } from "@/types/project";
import type { ProposalComment } from "../comments.functions";
import { PdfViewer, type PdfViewerRef } from "./pdf-viewer";
import { SpecialOrdersViewer } from "./special-orders-viewer";

interface ProposalReviewDocumentPaneProps {
	viewerRef: React.RefObject<PdfViewerRef | null>;
	currentDocument?: { url: string };
	initialPage?: number;
	specialOrderMembers?: ProjectMember[];
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
		classification?: "Remark" | "Revision required",
	) => Promise<void>;
	onToggleTheaterMode: () => void;
}

export function ProposalReviewDocumentPane({
	viewerRef,
	currentDocument,
	initialPage,
	specialOrderMembers,
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
			<div className="bg-muted border border-border rounded-[12px] shadow-[0_1px_3px_0_var(--shadow-card)] overflow-hidden min-h-[480px] h-[min(844px,calc(100dvh-10rem))] lg:h-[844px]">
				{specialOrderMembers ? (
					<SpecialOrdersViewer
						members={specialOrderMembers}
						isTheaterMode={isTheaterMode}
						onToggleTheaterMode={onToggleTheaterMode}
					/>
				) : currentDocument ? (
					<PdfViewer
						key={currentDocument.url}
						ref={viewerRef}
						url={currentDocument.url}
						initialPage={initialPage}
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
