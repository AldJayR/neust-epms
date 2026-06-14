"use client";

import {
	Minus,
	Plus,
	RotateCcw,
	Hand,
	MessageSquare,
	Maximize2,
	Minimize2,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import type { PdfViewerRef } from "./pdf-viewer";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProposalComment, AnnotationData } from "@/lib/comments.functions";

// Configure worker locally using Vite's native URL resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url
).toString();

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const DEFAULT_SCALE = 1;
const BASE_WIDTH = 650;
const BUFFER_PAGES = 1;

interface PdfInnerProps {
	url: string;
	proposalId?: string;
	documentId?: string;
	comments?: ProposalComment[];
	onAddComment?: (content: string, annotation: AnnotationData | null) => Promise<void>;
	isTheaterMode?: boolean;
	onToggleTheaterMode?: () => void;
}

interface PdfPageCanvasProps {
	pdfDoc: pdfjsLib.PDFDocumentProxy;
	pageNumber: number;
	width: number;
	scale: number;
	aspectRatio: number;
	onPageLoad: (pageNumber: number, aspect: number) => void;
	toolMode: "hand" | "comment";
	comments: ProposalComment[];
	onAddComment?: (content: string, annotation: AnnotationData | null) => Promise<void>;
}

/**
 * Isolated page canvas renderer that supports rendering cancellation.
 * If scale, width, or pageNumber changes, or if the page scrolls out of view (unmounts),
 * any active rendering task is canceled instantly to free up client-side CPU resources.
 */
function PdfPageCanvas({
	pdfDoc,
	pageNumber,
	width,
	scale,
	aspectRatio,
	onPageLoad,
	toolMode,
	comments,
	onAddComment,
}: PdfPageCanvasProps) {
	const canvasRef1 = useRef<HTMLCanvasElement>(null);
	const canvasRef2 = useRef<HTMLCanvasElement>(null);
	const [activeCanvas, setActiveCanvas] = useState<1 | 2>(1);
	const [isLoading, setIsLoading] = useState(true);
	const [hasRendered, setHasRendered] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const overlayRef = useRef<HTMLDivElement>(null);
	const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
	const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
	const [showCommentPopover, setShowCommentPopover] = useState(false);
	const [commentText, setCommentText] = useState("");
	const [pendingAnnotation, setPendingAnnotation] = useState<AnnotationData | null>(null);

	// Track the exact width and scale at which the active canvas was last successfully rendered
	const lastRenderedWidthRef = useRef<number>(width);
	const lastRenderedScaleRef = useRef<number>(scale);

	useEffect(() => {
		// Keep track of the active rendering task so we can cancel it on change/unmount
		// biome-ignore lint/suspicious/noExplicitAny: PDF.js Internal RenderTask type is complex
		let activeRenderTask: any = null;
		let isDestroyed = false;

		const renderPage = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Retrieve page instance
				const page = await pdfDoc.getPage(pageNumber);
				if (isDestroyed) return;

				// Determine which canvas is the target (hidden one)
				const targetCanvasIndex = activeCanvas === 1 && hasRendered ? 2 : 1;
				const targetCanvas = targetCanvasIndex === 1 ? canvasRef1.current : canvasRef2.current;
				if (!targetCanvas) return;

				// Get original dimensions to support landscape & horizontal pages
				const defaultViewport = page.getViewport({ scale: 1 });
				const aspect = defaultViewport.height / defaultViewport.width;
				onPageLoad(pageNumber, aspect);

				// Calculate scale factor relative to target width
				const scaleFactor = (width * scale) / defaultViewport.width;
				const viewport = page.getViewport({ scale: scaleFactor });

				const context = targetCanvas.getContext("2d");
				if (!context) return;

				// Cap Device Pixel Ratio to 1.5 to reduce VRAM memory footprint by up to 75% on high-DPI screens
				const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
				targetCanvas.width = viewport.width * dpr;
				targetCanvas.height = viewport.height * dpr;
				targetCanvas.style.width = `${viewport.width}px`;
				targetCanvas.style.height = `${viewport.height}px`;

				context.scale(dpr, dpr);

				const renderContext = {
					canvasContext: context,
					viewport: viewport,
				};

				// Start rendering task
				activeRenderTask = page.render(renderContext);

				await activeRenderTask.promise;
				if (!isDestroyed) {
					setActiveCanvas(targetCanvasIndex);
					lastRenderedWidthRef.current = width;
					lastRenderedScaleRef.current = scale;
					setHasRendered(true);
					setIsLoading(false);
				}
			} catch (err: unknown) {
				// Avoid throwing/logging expected cancellation exceptions
				const errorName = (err as Error)?.name;
				if (
					errorName === "RenderingCancelledException" ||
					errorName === "WorkerDragCancelledException"
				) {
					return;
				}
				if (!isDestroyed) {
					setError((err as Error).message || "Failed to render page");
					setIsLoading(false);
				}
			}
		};

		renderPage();

		return () => {
			isDestroyed = true;
			if (activeRenderTask) {
				try {
					activeRenderTask.cancel();
				} catch {
					// Ignore errors on render task cancellation
				}
			}
		};
		// biome-ignore lint/correctness/useExhaustiveDependencies: activeCanvas and hasRendered changes should not trigger a re-render
	}, [pdfDoc, pageNumber, width, scale]);

	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		if (toolMode !== "comment" || showCommentPopover) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const startX = e.clientX - rect.left;
		const startY = e.clientY - rect.top;
		setDragStart({ x: startX, y: startY });
		setDragCurrent({ x: startX, y: startY });
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!dragStart || showCommentPopover) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const currentX = e.clientX - rect.left;
		const currentY = e.clientY - rect.top;
		setDragCurrent({ x: currentX, y: currentY });
	};

	const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!dragStart || showCommentPopover) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const endX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
		const endY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

		const x1 = Math.min(dragStart.x, endX);
		const x2 = Math.max(dragStart.x, endX);
		const y1 = Math.min(dragStart.y, endY);
		const y2 = Math.max(dragStart.y, endY);

		const boxWidth = x2 - x1;
		const boxHeight = y2 - y1;

		if (boxWidth > 5 && boxHeight > 5) {
			const pctX = (x1 / rect.width) * 100;
			const pctY = (y1 / rect.height) * 100;
			const pctW = (boxWidth / rect.width) * 100;
			const pctH = (boxHeight / rect.height) * 100;

			setPendingAnnotation({
				x: pctX,
				y: pctY,
				width: pctW,
				height: pctH,
				page: pageNumber,
			});
			setShowCommentPopover(true);
		} else {
			setDragStart(null);
			setDragCurrent(null);
		}
	};

	const handleSaveComment = async () => {
		if (!commentText.trim() || !onAddComment || !pendingAnnotation) return;
		try {
			setIsLoading(true);
			await onAddComment(commentText, pendingAnnotation);
			setCommentText("");
			setShowCommentPopover(false);
			setPendingAnnotation(null);
			setDragStart(null);
			setDragCurrent(null);
		} catch (err) {
			setError((err as Error).message || "Failed to save comment");
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancelComment = () => {
		setCommentText("");
		setShowCommentPopover(false);
		setPendingAnnotation(null);
		setDragStart(null);
		setDragCurrent(null);
	};

	const dragBoxStyle: React.CSSProperties | null =
		dragStart && dragCurrent
			? {
					position: "absolute",
					left: Math.min(dragStart.x, dragCurrent.x),
					top: Math.min(dragStart.y, dragCurrent.y),
					width: Math.abs(dragCurrent.x - dragStart.x),
					height: Math.abs(dragCurrent.y - dragStart.y),
					border: "2px dashed #10b981",
					backgroundColor: "rgba(16, 185, 129, 0.15)",
					pointerEvents: "none",
				}
			: null;

	const popoverStyle: React.CSSProperties | null = pendingAnnotation
		? {
				position: "absolute",
				left: `${pendingAnnotation.x}%`,
				top: `${pendingAnnotation.y + pendingAnnotation.height}%`,
				transform: pendingAnnotation.y > 70 ? "translateY(-105%)" : "translateY(4px)",
				zIndex: 50,
			}
		: null;

	const overlayStyle: React.CSSProperties = {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		height: "100%",
		zIndex: 30,
		cursor: toolMode === "comment" ? "crosshair" : "default",
		pointerEvents: toolMode === "comment" ? "auto" : "none",
	};

	const activeScaleRatio =
		(width * scale) / (lastRenderedWidthRef.current * lastRenderedScaleRef.current || 1);

	const canvas1Style: React.CSSProperties = {
		position: "absolute",
		top: 0,
		left: 0,
		visibility: activeCanvas === 1 && hasRendered ? "visible" : "hidden",
		transform:
			activeCanvas === 1 && activeScaleRatio !== 1
				? `scale(${activeScaleRatio})`
				: undefined,
		transformOrigin: "top left",
		transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
	};

	const canvas2Style: React.CSSProperties = {
		position: "absolute",
		top: 0,
		left: 0,
		visibility: activeCanvas === 2 && hasRendered ? "visible" : "hidden",
		transform:
			activeCanvas === 2 && activeScaleRatio !== 1
				? `scale(${activeScaleRatio})`
				: undefined,
		transformOrigin: "top left",
		transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
	};

	return (
		<div
			className="relative flex items-center justify-center bg-white rounded shadow-sm overflow-hidden"
			style={{
				width: width * scale,
				height: width * aspectRatio * scale,
				transition:
					"width 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
			}}
		>
			<canvas ref={canvasRef1} style={canvas1Style} />
			<canvas ref={canvasRef2} style={canvas2Style} />

			{/* Interactive Overlay Layer */}
			<div
				ref={overlayRef}
				style={overlayStyle}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
			>
				{dragBoxStyle && <div style={dragBoxStyle} />}
			</div>

			{/* Render existing comments highlights (hoverable in hand mode) */}
			<TooltipProvider>
				{comments.map((comment) => {
					const annot = comment.annotationJson;
					if (!annot) return null;
					return (
						<Tooltip key={comment.commentId}>
							<TooltipTrigger
								render={
									<div
										style={{
											position: "absolute",
											left: `${annot.x}%`,
											top: `${annot.y}%`,
											width: `${annot.width}%`,
											height: `${annot.height}%`,
											zIndex: 20,
											pointerEvents: "auto",
										}}
										className="bg-yellow-400/25 border border-yellow-500/20 hover:bg-yellow-400/40 transition-colors cursor-pointer"
									/>
								}
							/>
							<TooltipContent className="bg-zinc-950 text-white border-zinc-800 p-3 max-w-[280px] shadow-lg rounded-[8px] z-50">
								<div className="space-y-1">
									<div className="flex items-center justify-between gap-4">
										<span className="font-semibold text-xs text-white">
											{comment.user.name}
										</span>
										<span className="text-[10px] text-zinc-400">
											{comment.user.roleName}
										</span>
									</div>
									<p className="text-[11px] leading-relaxed text-zinc-200">
										"{comment.content}"
									</p>
									<span className="text-[9px] block text-zinc-500 text-right">
										{new Date(comment.createdAt).toLocaleDateString()}
									</span>
								</div>
							</TooltipContent>
						</Tooltip>
					);
				})}
			</TooltipProvider>

			{/* Comment creation popover */}
			{showCommentPopover && pendingAnnotation && (
				<div
					style={popoverStyle || {}}
					className="bg-white border border-[#ebebeb] rounded-xl shadow-xl p-4 w-[280px] flex flex-col gap-3 z-50"
				>
					<div className="flex flex-col gap-0.5">
						<span className="text-[12px] font-semibold text-black">
							Add Remark / Comment
						</span>
						<span className="text-[10px] text-muted-foreground">
							Page {pageNumber}
						</span>
					</div>
					<textarea
						className="w-full h-20 text-[12px] p-2 border border-[#e5e5e5] rounded-[6px] focus:outline-none focus:border-brand-primary resize-none"
						placeholder="Type your feedback here..."
						value={commentText}
						onChange={(e) => setCommentText(e.target.value)}
						autoFocus
					/>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							size="sm"
							className="h-8 rounded-[6px] text-xs cursor-pointer"
							onClick={handleCancelComment}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							className="h-8 rounded-[6px] text-xs bg-brand-primary hover:bg-brand-primary-hover text-white cursor-pointer"
							onClick={handleSaveComment}
							disabled={!commentText.trim()}
						>
							Save
						</Button>
					</div>
				</div>
			)}

			{(!hasRendered || isLoading) && (
				<div
					className={`absolute inset-0 flex items-center justify-center bg-[#f5f5f5]/80 ${!hasRendered ? "animate-pulse" : ""}`}
				>
					{!hasRendered && (
						<div className="size-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
					)}
				</div>
			)}
			{error && (
				<div className="absolute inset-0 flex items-center justify-center text-xs text-red-500 bg-[#f5f5f5] p-4 text-center">
					{error}
				</div>
			)}
		</div>
	);
}

const PdfInner = forwardRef<PdfViewerRef, PdfInnerProps>((
	{
		url,
		proposalId,
		documentId,
		comments = [],
		onAddComment,
		isTheaterMode = false,
		onToggleTheaterMode,
	},
	ref,
) => {
	const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
	const [numPages, setNumPages] = useState(0);
	const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
	const [currentPage, setCurrentPage] = useState(1);
	const [scale, setScale] = useState(DEFAULT_SCALE);
	const [renderedScale, setRenderedScale] = useState(DEFAULT_SCALE);
	const [pageWidth, setPageWidth] = useState(BASE_WIDTH);
	const [loadingDoc, setLoadingDoc] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pageAspectRatios, setPageAspectRatios] = useState<Record<number, number>>({});
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

	// Debounce scale changes to prevent main-thread freezing during rapid zooming
	useEffect(() => {
		const handler = setTimeout(() => {
			setRenderedScale(scale);
		}, 250);
		return () => clearTimeout(handler);
	}, [scale]);

	// SSR-safe and Responsive Width hook
	useEffect(() => {
		const handleResize = () => {
			setPageWidth(Math.min(BASE_WIDTH, window.innerWidth - 120));
		};
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Keyboard shortcuts for zooming (Ctrl/Cmd + plus/minus/0, or direct plus/minus/0)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const activeEl = document.activeElement;
			if (
				activeEl &&
				(activeEl.tagName === "INPUT" ||
					activeEl.tagName === "TEXTAREA" ||
					activeEl.isContentEditable)
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
			const idx = ZOOM_STEPS.findIndex((s) => s >= prev);
			return ZOOM_STEPS[Math.min(idx + 1, ZOOM_STEPS.length - 1)];
		});
	}

	function zoomOut() {
		setScale((prev) => {
			const idx = ZOOM_STEPS.findLastIndex((s) => s <= prev);
			return ZOOM_STEPS[Math.max(idx - 1, 0)];
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
				{/* Floating Tool Mode Toolbar */}
				{onAddComment && (
					<div className="absolute top-4 left-4 z-40 bg-white/95 border border-[#ebebeb] px-2 py-1 rounded-full flex items-center gap-1 shadow-md backdrop-blur-md select-none">
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant={toolMode === "hand" ? "secondary" : "ghost"}
										size="icon"
										className={`size-8 rounded-full cursor-pointer ${toolMode === "hand" ? "bg-brand-primary/10 text-brand-primary" : "text-[#555]"}`}
										onClick={() => setToolMode("hand")}
									>
										<Hand className="size-4" />
									</Button>
								}
							/>
							<TooltipContent className="bg-zinc-950 text-white border-zinc-800 px-2 py-1 text-[11px] shadow-lg rounded-[6px] z-50">
								View & Select Text
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant={toolMode === "comment" ? "secondary" : "ghost"}
										size="icon"
										className={`size-8 rounded-full cursor-pointer ${toolMode === "comment" ? "bg-brand-primary/10 text-brand-primary" : "text-[#555]"}`}
										onClick={() => setToolMode("comment")}
									>
										<MessageSquare className="size-4" />
									</Button>
								}
							/>
							<TooltipContent className="bg-zinc-950 text-white border-zinc-800 px-2 py-1 text-[11px] shadow-lg rounded-[6px] z-50">
								Add Remark (Drag on page)
							</TooltipContent>
						</Tooltip>

						{onToggleTheaterMode && (
							<>
								<div className="w-px h-4 bg-[#ebebeb] mx-1" />
								<Tooltip>
									<TooltipTrigger
										render={
											<Button
												variant="ghost"
												size="icon"
												className="size-8 rounded-full cursor-pointer text-[#555] hover:bg-gray-100"
												onClick={onToggleTheaterMode}
											>
												{isTheaterMode ? (
													<Minimize2 className="size-4" />
												) : (
													<Maximize2 className="size-4" />
												)}
											</Button>
										}
									/>
									<TooltipContent className="bg-zinc-950 text-white border-zinc-800 px-2 py-1 text-[11px] shadow-lg rounded-[6px] z-50">
										{isTheaterMode ? "Exit Theater Mode" : "Theater Mode (Maximize View)"}
									</TooltipContent>
								</Tooltip>
							</>
						)}
					</div>
				)}

				{/* Floating Page Indicator Pill */}
				<div className="absolute top-4 right-4 z-40 bg-zinc-900/80 text-white px-3 py-1.5 rounded-full text-[12px] font-semibold tracking-wide backdrop-blur-md shadow-md border border-white/10 select-none">
					Page {currentPage} of {numPages || "–"}
				</div>

				<div
					ref={scrollRef}
					className="flex-1 overflow-auto p-4"
				>
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
												scale={renderedScale}
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

				<div className="flex items-center justify-center border-t border-[#ebebeb] bg-white px-4 py-2">
					{/* Zoom controls */}
					<div className="flex items-center gap-1.5">
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant="outline"
										size="icon"
										className="size-8 rounded-[8px] border-[#e5e5e5]"
										onClick={zoomOut}
										disabled={scale <= ZOOM_STEPS[0]}
									>
										<Minus className="size-3.5" />
									</Button>
								}
							/>
							<TooltipContent className="bg-zinc-950 text-white border-zinc-800 px-2 py-1 text-[11px] shadow-lg rounded-[6px] z-50">
								Zoom Out
							</TooltipContent>
						</Tooltip>

						<button
							type="button"
							onClick={resetZoom}
							className="text-[13px] text-[#666] tabular-nums w-[48px] text-center hover:text-[#11215a] cursor-pointer"
						>
							{Math.round(scale * 100)}%
						</button>

						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant="outline"
										size="icon"
										className="size-8 rounded-[8px] border-[#e5e5e5]"
										onClick={zoomIn}
										disabled={scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
									>
										<Plus className="size-3.5" />
									</Button>
								}
							/>
							<TooltipContent className="bg-zinc-950 text-white border-zinc-800 px-2 py-1 text-[11px] shadow-lg rounded-[6px] z-50">
								Zoom In
							</TooltipContent>
						</Tooltip>

						{scale !== DEFAULT_SCALE && (
							<Tooltip>
								<TooltipTrigger
									render={
										<Button
											variant="ghost"
											size="icon"
											className="size-8 rounded-[8px] text-[#666] hover:text-[#11215a]"
											onClick={resetZoom}
										>
											<RotateCcw className="size-3.5" />
										</Button>
									}
								/>
								<TooltipContent className="bg-zinc-950 text-white border-zinc-800 px-2 py-1 text-[11px] shadow-lg rounded-[6px] z-50">
									Reset Zoom
								</TooltipContent>
							</Tooltip>
						)}
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
});

PdfInner.displayName = "PdfInner";
export default PdfInner;
