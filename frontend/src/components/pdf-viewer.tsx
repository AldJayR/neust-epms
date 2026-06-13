"use client";

import { Suspense, lazy } from "react";

const PdfInner = lazy(() => import("./pdf-inner"));

interface PdfViewerProps {
	url: string;
	className?: string;
}

export function PdfViewer({ url, className }: PdfViewerProps) {
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
				<PdfInner url={url} />
			</Suspense>
		</div>
	);
}
