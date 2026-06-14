import { Suspense, lazy } from "react";
import type { ProposalComment, AnnotationData } from "@/lib/comments.functions";

const PdfInner = lazy(() => import("./pdf-inner"));

interface PdfViewerProps {
	url: string;
	className?: string;
	proposalId?: string;
	documentId?: string;
	comments?: ProposalComment[];
	onAddComment?: (content: string, annotation: AnnotationData | null) => Promise<void>;
}

export function PdfViewer({
	url,
	className,
	proposalId,
	documentId,
	comments,
	onAddComment,
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
					url={url}
					proposalId={proposalId}
					documentId={documentId}
					comments={comments}
					onAddComment={onAddComment}
				/>
			</Suspense>
		</div>
	);
}
