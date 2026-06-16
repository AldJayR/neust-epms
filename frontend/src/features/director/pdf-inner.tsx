"use client";

import * as pdfjsLib from "pdfjs-dist";
import {
	forwardRef,
	useDeferredValue,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AnnotationData, ProposalComment } from "@/lib/comments.functions";
import type { PdfViewerRef } from "@/components/pdf-viewer";
import {
	PdfToolbar,
	ZOOM_STEPS,
	DEFAULT_SCALE,
} from "./components/pdf-toolbar";
import { PdfPageCanvas } from "./components/pdf-canvas";

// Configure worker locally using Vite's native URL resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

const BASE_WIDTH = 650;
const BUFFER_PAGES = 1;

interface PdfInnerProps {
	url: string;
	proposalId?: string;
	documentId?: string;
	comments?: ProposalComment[];
	onAddComment?: (
		content: string,
		annotation: AnnotationData | null,
	) => Promise<void>;
	isTheaterMode?: boolean;
	onToggleTheaterMode?: () => void;
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

const PdfInner = forwardRef<PdfViewerRef, PdfInnerProps>(
	(
		{
			url,
			comments = [],
			onAddComment,
			isTheaterMode = false,
			onToggleTheaterMode,
		},
		ref,
	) => {
		const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(
			null,
		);
		const [numPages, setNumPages] = useState(0);
		const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
		const [currentPage, setCurrentPage] = useState(1);
		const [scale, setScale] = useState(DEFAULT_SCALE);
		const deferredScale = useDeferredValue(scale);
		const windowWidth = useSyncExternalStore(
			subscribeWidth,
			getWidthSnapshot,
			getServerWidthSnapshot,
		);
		const pageWidth = Math.min(BASE_WIDTH, windowWidth - 120);
		const [loadingDoc, setLoadingDoc] = useState(true);
		const [error, setError] = useState<string | null>(null);
		const [pageAspectRatios, setPageAspectRatios] = useState<
			Record<number, number>
		>({});
		const [toolMode, setToolMode] = useState<"hand" | "comment">("hand");

		const scrollRef = useRef<HTMLDivElement>(null);
		const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

		useImperativeHandle(ref, () => ({
			scrollToPage: (pageNumber: number) => {
				const pageEl = pageRefs.current.get(pageNumber);
				if (pageEl) {
					pageEl.scrollIntoView({ behavior: "smooth", block: "center" });
				}
			},
		}));

		const handlePageLoad = (pageNumber: number, aspect: number) => {
			setPageAspectRatios((prev) => {
				if (prev[pageNumber] === aspect) return prev;
				return { ...prev, [pageNumber]: aspect };
			});
		};

		// Keyboard shortcuts for zooming (Ctrl/Cmd + plus/minus/0, or direct plus/minus/0)
		// biome-ignore lint/correctness/useExhaustiveDependencies: zoom controls are stable and shouldn't trigger listener reset
		useEffect(() => {
			const handleKeyDown = (e: KeyboardEvent) => {
				const activeEl = document.activeElement;
				if (
					activeEl &&
					(activeEl.tagName === "INPUT" ||
						activeEl.tagName === "TEXTAREA" ||
						(activeEl instanceof HTMLElement && activeEl.isContentEditable))
				) {
					return;
				}

				// Support both direct keystrokes (+, -, 0) and Ctrl/Cmd modifier combos
				const isZoomIn =
					e.key === "=" ||
					e.key === "+" ||
					(e.ctrlKey && e.key === "=") ||
					(e.metaKey && e.key === "=");
				const isZoomOut =
					e.key === "-" ||
					e.key === "_" ||
					(e.ctrlKey && e.key === "-") ||
					(e.metaKey && e.key === "-");
				const isZoomReset =
					e.key === "0" ||
					(e.ctrlKey && e.key === "0") ||
					(e.metaKey && e.key === "0");

				if (isZoomIn) {
					e.preventDefault();
					zoomIn();
				} else if (isZoomOut) {
					e.preventDefault();
					zoomOut();
				} else if (isZoomReset) {
					e.preventDefault();
					resetZoom();
				}
			};

			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, []);

		// Load document progressively on mount using Byte-Range requests
		useEffect(() => {
			let isDestroyed = false;
			// biome-ignore lint/suspicious/noExplicitAny: PDF.js Internal getDocument task type is complex
			let loadingTask: any = null;

			const loadDocument = async () => {
				try {
					setLoadingDoc(true);
					setError(null);

					loadingTask = pdfjsLib.getDocument({
						url,
						cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
						cMapPacked: true,
						standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
						disableAutoFetch: true, // Only download requested page byte ranges
						disableRange: false,
						disableStream: false,
					});

					const doc = await loadingTask.promise;
					if (isDestroyed) {
						loadingTask.destroy().catch(() => {});
						return;
					}

					setPdfDoc(doc);
					setNumPages(doc.numPages);
					setVisiblePages(new Set([1]));
					setCurrentPage(1);
					setLoadingDoc(false);
				} catch (err: unknown) {
					if (!isDestroyed) {
						setError((err as Error).message || "Failed to load PDF document");
						setLoadingDoc(false);
					}
				}
			};

			loadDocument();

			return () => {
				isDestroyed = true;
				if (loadingTask) {
					loadingTask.destroy().catch(() => {});
				}
			};
		}, [url]);

		// Intersection observers for virtualization & active page tracking
		useEffect(() => {
			const scrollEl = scrollRef.current;
			if (!scrollEl || numPages === 0) return;

			// Virtualization preload observer (unmounts non-visible pages to clear GPU canvases)
			const preloadObserver = new IntersectionObserver(
				(entries) => {
					setVisiblePages((prev) => {
						const next = new Set(prev);
						for (const entry of entries) {
							const pg = Number((entry.target as HTMLElement).dataset.page);
							if (entry.isIntersecting) {
								next.add(pg);
							} else {
								next.delete(pg);
							}
						}
						return next;
					});
				},
				{
					root: scrollEl,
					rootMargin: `${BUFFER_PAGES * 200}px 0px`,
					threshold: 0,
				},
			);

			// Precise active-page tracker observer (fixes premature updates and scroll-up issue)
			const pageTrackerObserver = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) {
							const pg = Number((entry.target as HTMLElement).dataset.page);
							setCurrentPage(pg);
						}
					}
				},
				{
					root: scrollEl,
					rootMargin: "-10% 0px -80% 0px", // Focuses on the upper segment of the viewport
					threshold: 0,
				},
			);

			// Small delay to ensure elements are mounted before registration
			const timer = setTimeout(() => {
				for (const [, el] of pageRefs.current) {
					preloadObserver.observe(el);
					pageTrackerObserver.observe(el);
				}
			}, 100);

			return () => {
				clearTimeout(timer);
				preloadObserver.disconnect();
				pageTrackerObserver.disconnect();
			};
		}, [numPages]);

		// Navigation is scroll-driven now

		function zoomIn() {
			setScale((prev) => {
				for (const s of ZOOM_STEPS) {
					if (s > prev) return s;
				}
				return ZOOM_STEPS[ZOOM_STEPS.length - 1] ?? DEFAULT_SCALE;
			});
		}

		function zoomOut() {
			setScale((prev) => {
				for (let i = ZOOM_STEPS.length - 1; i >= 0; i--) {
					const s = ZOOM_STEPS[i];
					if (s !== undefined && s < prev) return s;
				}
				return ZOOM_STEPS[0] ?? DEFAULT_SCALE;
			});
		}

		function resetZoom() {
			setScale(DEFAULT_SCALE);
		}

		if (error) {
			return (
				<div className="flex h-full items-center justify-center text-[#737373]">
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

					<div ref={scrollRef} className="flex-1 overflow-auto p-4">
						<div className="flex flex-col items-center gap-4 w-fit mx-auto">
							{pdfDoc &&
								Array.from({ length: numPages }, (_, i) => {
									const pg = i + 1;
									const aspect = pageAspectRatios[pg] || Math.SQRT2;
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
													onPageLoad={handlePageLoad}
													toolMode={toolMode}
													comments={comments.filter(
														(c) => c.annotationJson?.page === pg,
													)}
													onAddComment={onAddComment}
												/>
											) : (
												<div
													className="rounded bg-[#f5f5f5] animate-pulse flex items-center justify-center"
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
					</div>
				</div>
			</TooltipProvider>
		);
	},
);

PdfInner.displayName = "PdfInner";
export default PdfInner;
