import "./pdf-ssr-polyfill";
import * as pdfjsLib from "pdfjs-dist";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ProposalComment } from "../../comments.functions";
import { usePdfDocument } from "./hooks/use-pdf-document";
import { usePdfZoom } from "./hooks/use-pdf-zoom";
import { PdfPageCanvas } from "./pdf-canvas";
import { ZOOM_STEPS } from "./pdf-constants";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

const EMPTY_COMMENTS: ProposalComment[] = [];

export default function FirstPagePreview({
	url,
	onRetry,
	retrying,
}: {
	url: string;
	onRetry: () => void;
	retrying: boolean;
}) {
	// Range loading without streaming avoids automatically fetching the remaining pages.
	const { pdfDoc, loadingDoc, error } = usePdfDocument(url, true);
	const { scale, zoomIn, zoomOut, resetZoom } = usePdfZoom();
	const viewportRef = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	const [aspectRatio, setAspectRatio] = useState<number | null>(null);
	const [pageError, setPageError] = useState<string | null>(null);

	useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		const measure = () =>
			setWidth(Math.max(0, Math.floor(viewport.clientWidth - 24)));
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(viewport);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!pdfDoc) return;
		let cancelled = false;
		setAspectRatio(null);
		setPageError(null);
		void pdfDoc
			.getPage(1)
			.then((page) => {
				if (cancelled) return;
				const viewport = page.getViewport({ scale: 1 });
				setAspectRatio(viewport.height / viewport.width);
			})
			.catch(() => {
				if (!cancelled)
					setPageError("Unable to load the first page of the proposal.");
			});
		return () => {
			cancelled = true;
		};
	}, [pdfDoc]);

	const failed = Boolean(error || pageError || !url);
	const ready = !loadingDoc && !failed && pdfDoc && aspectRatio && width > 0;

	return (
		<div className="min-w-0 overflow-hidden rounded-md border">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card p-2">
				<span className="text-xs font-medium">Page 1 only</span>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label="Zoom out proposal preview"
						disabled={!ready || scale <= ZOOM_STEPS[0]}
						onClick={zoomOut}
					>
						<Minus />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						aria-label="Fit proposal preview to width"
						disabled={!ready}
						onClick={resetZoom}
					>
						{Math.round(scale * 100)}%
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label="Zoom in proposal preview"
						disabled={!ready || scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
						onClick={zoomIn}
					>
						<Plus />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label="Reload proposal preview"
						disabled={retrying}
						onClick={onRetry}
					>
						<RotateCcw />
					</Button>
				</div>
			</div>
			<div
				ref={viewportRef}
				className="h-[min(52vh,560px)] min-h-48 overflow-auto bg-muted/40 p-3"
				style={{ scrollbarGutter: "stable" }}
			>
				{failed ? (
					<div
						role="alert"
						className="flex h-full flex-col items-center justify-center gap-3 text-center"
					>
						<p className="text-sm text-muted-foreground">
							Unable to display the proposal’s first page.
						</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={retrying}
							onClick={onRetry}
						>
							Retry preview
						</Button>
					</div>
				) : ready ? (
					<div
						className="mx-auto"
						role="img"
						aria-label="First page of the project proposal"
						style={{ width: width * scale }}
					>
						<PdfPageCanvas
							pdfDoc={pdfDoc}
							pageNumber={1}
							width={width}
							scale={scale}
							aspectRatio={aspectRatio}
							toolMode="hand"
							comments={EMPTY_COMMENTS}
							readOnly
						/>
					</div>
				) : (
					<p
						role="status"
						className="flex h-full items-center justify-center text-sm text-muted-foreground"
					>
						Loading proposal’s first page…
					</p>
				)}
			</div>
		</div>
	);
}
