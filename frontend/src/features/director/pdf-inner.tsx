"use client";

import "./pdf-ssr-polyfill";
import * as pdfjsLib from "pdfjs-dist";
import type { Ref } from "react";
import {
	useDeferredValue,
	useEffect,
	useImperativeHandle,
	useRef,
	useReducer,
	useSyncExternalStore,
} from "react";
import type { PdfViewerRef } from "@/components/pdf-viewer";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AnnotationData, ProposalComment } from "@/lib/comments.functions";
import { PdfPageCanvas } from "./components/pdf-canvas";
import { DEFAULT_SCALE, ZOOM_STEPS } from "./components/pdf-constants";
import { PdfToolbar } from "./components/pdf-toolbar";

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

interface State {
	pdfDoc: pdfjsLib.PDFDocumentProxy | null;
	numPages: number;
	visiblePages: Set<number>;
	currentPage: number;
	scale: number;
	loadingDoc: boolean;
	error: string | null;
	pageAspectRatios: Record<number, number>;
	toolMode: "hand" | "comment";
	isDragging: boolean;
}

const initialState: State = {
	pdfDoc: null,
	numPages: 0,
	visiblePages: new Set([1]),
	currentPage: 1,
	scale: DEFAULT_SCALE,
	loadingDoc: true,
	error: null,
	pageAspectRatios: {},
	toolMode: "hand",
	isDragging: false,
};

function stateReducer(state: State, action: Partial<State> | ((prev: State) => Partial<State>)): State {
	const next = typeof action === "function" ? action(state) : action;
	return { ...state, ...next };
}

const PdfInner = ({
	url,
	comments = EMPTY_COMMENTS,
	onAddComment,
	isTheaterMode = false,
	onToggleTheaterMode,
	ref,
}: PdfInnerProps) => {
	const [state, dispatch] = useReducer(stateReducer, initialState);
	const {
		pdfDoc,
		numPages,
		visiblePages,
		currentPage,
		scale,
		loadingDoc,
		error,
		pageAspectRatios,
		toolMode,
		isDragging,
	} = state;

	const deferredScale = useDeferredValue(scale);
	const windowWidth = useSyncExternalStore(
		subscribeWidth,
		getWidthSnapshot,
		getServerWidthSnapshot,
	);
	const pageWidth = Math.min(BASE_WIDTH, windowWidth - 120);

	const scrollRef = useRef<HTMLDivElement>(null);
	const pageRefs = useRef<Map<number, HTMLDivElement>>(null!);
	if (pageRefs.current === null) {
		pageRefs.current = new Map();
	}
	const dragStartScroll = useRef({ left: 0, top: 0, x: 0, y: 0 });

	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		if (toolMode !== "hand" || !scrollRef.current) return;
		if (e.button !== 0) return; // Only left click

		const target = e.target as HTMLElement;
		if (
			target.closest("button") ||
			target.closest("textarea") ||
			target.closest("input") ||
			target.closest("[role='tooltip']") ||
			target.closest(".cursor-pointer") ||
			target.closest(".textLayer span")
		) {
			return;
		}

		dispatch({ isDragging: true });
		dragStartScroll.current = {
			left: scrollRef.current.scrollLeft,
			top: scrollRef.current.scrollTop,
			x: e.clientX,
			y: e.clientY,
		};
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!isDragging || toolMode !== "hand" || !scrollRef.current) return;
		e.preventDefault();

		const dx = e.clientX - dragStartScroll.current.x;
		const dy = e.clientY - dragStartScroll.current.y;

		scrollRef.current.scrollLeft = dragStartScroll.current.left - dx;
		scrollRef.current.scrollTop = dragStartScroll.current.top - dy;
	};

	const handleMouseUpOrLeave = () => {
		dispatch({ isDragging: false });
	};

	useImperativeHandle(ref, () => ({
		scrollToPage: (pageNumber: number) => {
			const pageEl = pageRefs.current.get(pageNumber);
			if (pageEl) {
				pageEl.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		},
	}));



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
				dispatch({ loadingDoc: true, error: null });

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

				dispatch({
					pdfDoc: doc,
					numPages: doc.numPages,
					visiblePages: new Set([1]),
					currentPage: 1,
				});

				try {
					const firstPage = await doc.getPage(1);
					const viewport = firstPage.getViewport({ scale: 1 });
					dispatch({
						pageAspectRatios: { 1: viewport.height / viewport.width },
						loadingDoc: false,
					});
				} catch {
					dispatch({
						pageAspectRatios: { 1: Math.SQRT2 },
						loadingDoc: false,
					});
				}
			} catch (err: unknown) {
				if (!isDestroyed) {
					dispatch({
						error: (err as Error).message || "Failed to load PDF document",
						loadingDoc: false,
					});
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

	useEffect(() => {
		if (!pdfDoc) return;
		let isDestroyed = false;

		const fetchAspectRatios = async () => {
			const pagesToFetch = Array.from(visiblePages).filter(
				(pageNum) => pageAspectRatios[pageNum] === undefined,
			);

			if (pagesToFetch.length === 0) return;

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
				dispatch((prev) => {
					let changed = false;
					const updated = { ...prev.pageAspectRatios };
					for (const [pageNumStr, aspect] of Object.entries(newAspects)) {
						const pageNum = Number(pageNumStr);
						if (prev.pageAspectRatios[pageNum] !== aspect) {
							updated[pageNum] = aspect;
							changed = true;
						}
					}
					return changed ? { pageAspectRatios: updated } : {};
				});
			}
		};

		fetchAspectRatios();

		return () => {
			isDestroyed = true;
		};
	}, [pdfDoc, visiblePages, pageAspectRatios]);

	// Intersection observers for virtualization & active page tracking
	useEffect(() => {
		const scrollEl = scrollRef.current;
		if (!scrollEl || numPages === 0) return;

		// Virtualization preload observer (unmounts non-visible pages to clear GPU canvases)
		const preloadObserver = new IntersectionObserver(
			(entries) => {
				dispatch((prev) => {
					const next = new Set(prev.visiblePages);
					for (const entry of entries) {
						const pg = Number((entry.target as HTMLElement).dataset.page);
						if (entry.isIntersecting) {
							next.add(pg);
						} else {
							next.delete(pg);
						}
					}
					return { visiblePages: next };
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
						dispatch({ currentPage: pg });
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
		dispatch((prev) => {
			let nextScale = ZOOM_STEPS[ZOOM_STEPS.length - 1] ?? DEFAULT_SCALE;
			for (const s of ZOOM_STEPS) {
				if (s > prev.scale) {
					nextScale = s;
					break;
				}
			}
			return { scale: nextScale };
		});
	}

	function zoomOut() {
		dispatch((prev) => {
			let nextScale = ZOOM_STEPS[0] ?? DEFAULT_SCALE;
			for (let i = ZOOM_STEPS.length - 1; i >= 0; i--) {
				const s = ZOOM_STEPS[i];
				if (s !== undefined && s < prev.scale) {
					nextScale = s;
					break;
				}
			}
			return { scale: nextScale };
		});
	}

	function resetZoom() {
		dispatch({ scale: DEFAULT_SCALE });
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
					onToolModeChange={(mode) => dispatch({ toolMode: mode })}
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

				<div
					ref={scrollRef}
					role="region"
					aria-label="PDF Page Viewer"
					className={`flex-1 overflow-auto p-4 ${
						toolMode === "hand"
							? isDragging
								? "cursor-grabbing select-none"
								: "cursor-grab"
							: ""
					}`}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUpOrLeave}
					onMouseLeave={handleMouseUpOrLeave}
				>
					<div className="flex flex-col items-center gap-4 w-fit mx-auto">
						{pdfDoc &&
							Array.from({ length: numPages }, (_, i) => {
								const pg = i + 1;
								const aspect = pageAspectRatios[pg] || pageAspectRatios[1] || Math.SQRT2;
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
};

export default PdfInner;
