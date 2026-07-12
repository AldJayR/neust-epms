"use client";

import "./pdf-ssr-polyfill";
import * as pdfjsLib from "pdfjs-dist";
import type { Ref } from "react";
import {
	useDeferredValue,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import type { PdfViewerRef } from "../pdf-viewer";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AnnotationData, ProposalComment } from "@/lib/comments.functions";
import { useHandDrag } from "./hooks/use-hand-drag";
import { usePdfDocument } from "./hooks/use-pdf-document";
import { usePdfKeyboard } from "./hooks/use-pdf-keyboard";
import { usePdfVisibility } from "./hooks/use-pdf-visibility";
import { usePdfZoom } from "./hooks/use-pdf-zoom";
import { PdfPageCanvas } from "./pdf-canvas";
import { PdfToolbar } from "./pdf-toolbar";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

const BASE_WIDTH = 650;

interface PdfInnerProps {
	url: string;
	comments?: ProposalComment[];
	onAddComment?: (
		content: string,
		annotation: AnnotationData | null,
	) => Promise<void>;
	isTheaterMode?: boolean;
	onToggleTheaterMode?: () => void;
	ref?: Ref<PdfViewerRef>;
}

function subscribeWidth(callback: () => void) {
	window.addEventListener("resize", callback);
	return () => window.removeEventListener("resize", callback);
}

function getWidthSnapshot() {
	return window.innerWidth;
}

function getServerWidthSnapshot() {
	return 1024;
}

const EMPTY_COMMENTS: ProposalComment[] = [];

const PdfInner = ({
	url,
	comments = EMPTY_COMMENTS,
	onAddComment,
	isTheaterMode = false,
	onToggleTheaterMode,
	ref,
}: PdfInnerProps) => {
	const { pdfDoc, numPages, loadingDoc, error } = usePdfDocument(url);
	const scrollRef = useRef<HTMLDivElement>(null);
	// biome-ignore lint/style/noNonNullAssertion: initialized on first render below
	const pageRefs = useRef<Map<number, HTMLDivElement>>(null!);
	if (pageRefs.current === null) {
		pageRefs.current = new Map();
	}

	const { visiblePages, currentPage } = usePdfVisibility(
		scrollRef,
		numPages,
		loadingDoc,
		pageRefs,
	);
	const { scale, zoomIn, zoomOut, resetZoom } = usePdfZoom();
	const [toolMode, setToolMode] = useState<"hand" | "comment">("hand");
	const { isDragging, handlers: dragHandlers } = useHandDrag({
		scrollRef,
		toolMode,
	});

	usePdfKeyboard({ zoomIn, zoomOut, resetZoom });

	const deferredScale = useDeferredValue(scale);
	const windowWidth = useSyncExternalStore(
		subscribeWidth,
		getWidthSnapshot,
		getServerWidthSnapshot,
	);
	const pageWidth = Math.min(BASE_WIDTH, windowWidth - 120);

	const [pageAspectRatios, setPageAspectRatios] = useState<
		Record<number, number>
	>({});
	const fetchedPagesRef = useRef<Set<number>>(new Set());

	// Fetch aspect ratios for visible pages (ref tracks fetched to avoid self-triggering deps)
	useEffect(() => {
		if (!pdfDoc) return;
		let isDestroyed = false;

		const pagesToFetch = Array.from(visiblePages).filter(
			(pageNum) => !fetchedPagesRef.current.has(pageNum),
		);

		if (pagesToFetch.length === 0) return;

		// Mark as in-flight immediately to prevent double-fetch on re-render
		for (const p of pagesToFetch) fetchedPagesRef.current.add(p);

		(async () => {
			const newAspects: Record<number, number> = {};
			await Promise.all(
				pagesToFetch.map(async (pageNum) => {
					try {
						const page = await pdfDoc.getPage(pageNum);
						const viewport = page.getViewport({ scale: 1 });
						newAspects[pageNum] = viewport.height / viewport.width;
					} catch {
						newAspects[pageNum] = Math.SQRT2;
					}
				}),
			);

			if (!isDestroyed) {
				setPageAspectRatios((prev) => {
					let changed = false;
					const updated = { ...prev };
					for (const [pageNumStr, aspect] of Object.entries(newAspects)) {
						const pageNum = Number(pageNumStr);
						if (prev[pageNum] !== aspect) {
							updated[pageNum] = aspect;
							changed = true;
						}
					}
					return changed ? updated : prev;
				});
			}
		})();

		return () => {
			isDestroyed = true;
		};
	}, [pdfDoc, visiblePages]);

	useImperativeHandle(ref, () => ({
		scrollToPage: (pageNumber: number) => {
			const pageEl = pageRefs.current.get(pageNumber);
			if (pageEl) {
				pageEl.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		},
	}));

	if (error) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground">
				{error}
			</div>
		);
	}

	if (loadingDoc) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="size-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<TooltipProvider>
			<div className="relative flex flex-col h-full w-full">
				<PdfToolbar
					toolMode={toolMode}
					onToolModeChange={setToolMode}
					showCommentTools={!!onAddComment}
					isTheaterMode={isTheaterMode}
					onToggleTheaterMode={onToggleTheaterMode}
					currentPage={currentPage}
					numPages={numPages}
					scale={scale}
					onZoomIn={zoomIn}
					onZoomOut={zoomOut}
					onResetZoom={resetZoom}
				/>

				<section
					ref={scrollRef}
					aria-label="PDF Page Viewer"
					className={`flex-1 overflow-auto p-4 ${
						toolMode === "hand"
							? isDragging
								? "cursor-grabbing select-none"
								: "cursor-grab"
							: ""
					}`}
					{...dragHandlers}
				>
					<div className="flex flex-col items-center gap-4 w-fit mx-auto">
						{pdfDoc &&
							Array.from({ length: numPages }, (_, i) => {
								const pg = i + 1;
								const aspect =
									pageAspectRatios[pg] || pageAspectRatios[1] || Math.SQRT2;
								return (
									<div
										key={pg}
										ref={(el) => {
											if (el) pageRefs.current.set(pg, el);
											else pageRefs.current.delete(pg);
										}}
										data-page={pg}
									>
										{visiblePages.has(pg) ? (
											<PdfPageCanvas
												pdfDoc={pdfDoc}
												pageNumber={pg}
												width={pageWidth}
												scale={deferredScale}
												aspectRatio={aspect}
												toolMode={toolMode}
												comments={comments.filter(
													(c) => c.annotationJson?.page === pg,
												)}
												onAddComment={onAddComment}
											/>
										) : (
											<div
												className="rounded bg-muted animate-pulse flex items-center justify-center"
												style={{
													width: pageWidth * scale,
													height: pageWidth * aspect * scale,
												}}
											/>
										)}
									</div>
								);
							})}
					</div>
				</section>
			</div>
		</TooltipProvider>
	);
};

export default PdfInner;
