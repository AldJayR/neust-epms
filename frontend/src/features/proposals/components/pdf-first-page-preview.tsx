import { lazy, Suspense } from "react";

const FirstPagePreview = lazy(() => import("./pdf-viewer/first-page-preview"));

export function PdfFirstPagePreview({
	url,
	onRetry,
	retrying = false,
}: {
	url: string;
	onRetry: () => void;
	retrying?: boolean;
}) {
	return (
		<Suspense
			fallback={
				<p
					role="status"
					className="flex h-[min(52vh,560px)] items-center justify-center text-sm text-muted-foreground"
				>
					Loading proposal preview…
				</p>
			}
		>
			<FirstPagePreview
				key={url}
				url={url}
				onRetry={onRetry}
				retrying={retrying}
			/>
		</Suspense>
	);
}
