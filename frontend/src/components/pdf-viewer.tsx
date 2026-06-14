import { Suspense, lazy, forwardRef } from "react";
import type { ProposalComment, AnnotationData } from "@/lib/comments.functions";

const PdfInner = lazy(() => import("./pdf-inner"));

export interface PdfViewerRef {
	scrollToPage: (pageNumber: number) => void;
}

interface PdfViewerProps {
	url: string;
	className?: string;
	proposalId?: string;
	documentId?: string;
	comments?: ProposalComment[];
	onAddComment?: (content: string, annotation: AnnotationData | null) => Promise<void>;
	isTheaterMode?: boolean;
	onToggleTheaterMode?: () => void;
}

export const PdfViewer = forwardRef<PdfViewerRef, PdfViewerProps>(
	(
		{
			url,
			className,
			proposalId,
			documentId,
			comments,
			onAddComment,
			isTheaterMode,
			onToggleTheaterMode,
		},
		ref,
	) => {
		return (
			<div
				className={`flex flex-col items-center gap-4 overflow-y-auto p-4 ${className ?? ""}`}
				style={{ height: "100%" }}
			>
				<Suspense
					fallback={
						<div className="flex h-full items-center justify-center">
							<div className="size-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
						</div>
					}
				>
					<PdfInner
						ref={ref}
						url={url}
						proposalId={proposalId}
						documentId={documentId}
						comments={comments}
						onAddComment={onAddComment}
						isTheaterMode={isTheaterMode}
						onToggleTheaterMode={onToggleTheaterMode}
					/>
				</Suspense>
			</div>
		);
	},
);

PdfViewer.displayName = "PdfViewer";
