import type { Ref } from "react";
import { lazy, Suspense } from "react";
import type { AnnotationData, ProposalComment } from "../comments.functions";

const PdfInner = lazy(() => import("./pdf-viewer/pdf-inner"));

export interface PdfViewerRef {
	scrollToPage: (pageNumber: number) => void;
}

interface PdfViewerProps {
	url: string;
	className?: string;
	comments?: ProposalComment[];
	onAddComment?: (
		content: string,
		annotation: AnnotationData | null,
	) => Promise<void>;
	isTheaterMode?: boolean;
	onToggleTheaterMode?: () => void;
	ref?: Ref<PdfViewerRef>;
}

export function PdfViewer({
	url,
	className,
	comments,
	onAddComment,
	isTheaterMode,
	onToggleTheaterMode,
	ref,
}: PdfViewerProps) {
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
					comments={comments}
					onAddComment={onAddComment}
					isTheaterMode={isTheaterMode}
					onToggleTheaterMode={onToggleTheaterMode}
				/>
			</Suspense>
		</div>
	);
}
