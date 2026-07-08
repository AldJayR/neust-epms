import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useReducer, useRef } from "react";
import type { AnnotationData, ProposalComment } from "@/lib/comments.functions";
import { stateReducer } from "@/lib/state-reducer";
import { CommentCreationPopover, CommentHighlights } from "./pdf-annotations";

interface PdfPageCanvasProps {
	pdfDoc: pdfjsLib.PDFDocumentProxy;
	pageNumber: number;
	width: number;
	scale: number;
	aspectRatio: number;
	toolMode: "hand" | "comment";
	comments: ProposalComment[];
	onAddComment?: (
		content: string,
		annotation: AnnotationData | null,
	) => Promise<void>;
}

interface State {
	activeCanvas: 1 | 2;
	isLoading: boolean;
	hasRendered: boolean;
	error: string | null;
	dragStart: { x: number; y: number } | null;
	dragCurrent: { x: number; y: number } | null;
	showCommentPopover: boolean;
	commentText: string;
	pendingAnnotation: AnnotationData | null;
	lastRendered: { width: number; scale: number };
}

export function PdfPageCanvas({
	pdfDoc,
	pageNumber,
	width,
	scale,
	aspectRatio,
	toolMode,
	comments,
	onAddComment,
}: PdfPageCanvasProps) {
	const canvasRef1 = useRef<HTMLCanvasElement>(null);
	const canvasRef2 = useRef<HTMLCanvasElement>(null);
	const textLayerRef = useRef<HTMLDivElement>(null);

	const [state, dispatch] = useReducer(stateReducer<State>, undefined, () => ({
		activeCanvas: 1 as 1 | 2,
		isLoading: true,
		hasRendered: false,
		error: null,
		dragStart: null,
		dragCurrent: null,
		showCommentPopover: false,
		commentText: "",
		pendingAnnotation: null,
		lastRendered: { width, scale },
	}));

	const {
		activeCanvas,
		isLoading,
		hasRendered,
		error,
		dragStart,
		dragCurrent,
		showCommentPopover,
		commentText,
		pendingAnnotation,
		lastRendered,
	} = state;

	const overlayRef = useRef<HTMLButtonElement>(null);

	const activeCanvasRef = useRef(activeCanvas);
	const hasRenderedRef = useRef(hasRendered);

	// Assign refs during render — safe for mutable refs (not reactive)
	activeCanvasRef.current = activeCanvas;
	hasRenderedRef.current = hasRendered;

	useEffect(() => {
		let activeRenderTask: pdfjsLib.RenderTask | null = null;
		let isDestroyed = false;
		const textLayerEl = textLayerRef.current;

		const renderPage = async () => {
			try {
				dispatch({ isLoading: true, error: null });

				// Retrieve page instance
				const page = await pdfDoc.getPage(pageNumber);
				if (isDestroyed) return;

				// Determine which canvas is the target (hidden one)
				const targetCanvasIndex =
					activeCanvasRef.current === 1 && hasRenderedRef.current ? 2 : 1;
				const targetCanvas =
					targetCanvasIndex === 1 ? canvasRef1.current : canvasRef2.current;
				if (!targetCanvas) return;

				// Get original dimensions to support landscape & horizontal pages
				const defaultViewport = page.getViewport({ scale: 1 });

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
					canvas: targetCanvas,
					canvasContext: context,
					viewport: viewport,
				};

				// Start rendering task
				activeRenderTask = page.render(renderContext);

				await activeRenderTask.promise;
				if (!isDestroyed) {
					dispatch({
						activeCanvas: targetCanvasIndex,
						lastRendered: { width, scale },
						hasRendered: true,
						isLoading: false,
					});

					// Render Text Layer
					if (textLayerEl) {
						textLayerEl.innerHTML = "";
						textLayerEl.style.setProperty(
							"--scale-factor",
							String(scaleFactor),
						);
						const textContent = await page.getTextContent();
						if (!isDestroyed && textLayerEl) {
							const textLayer = new pdfjsLib.TextLayer({
								textContentSource: textContent,
								container: textLayerEl,
								viewport: viewport,
							});
							await textLayer.render();
						}
					}
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
					dispatch({
						error: (err as Error).message || "Failed to render page",
						isLoading: false,
					});
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
			if (textLayerEl) {
				textLayerEl.innerHTML = "";
			}
		};
	}, [pdfDoc, pageNumber, width, scale]);

	const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (toolMode !== "comment" || showCommentPopover) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const startX = e.clientX - rect.left;
		const startY = e.clientY - rect.top;
		dispatch({
			dragStart: { x: startX, y: startY },
			dragCurrent: { x: startX, y: startY },
		});
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (!dragStart || showCommentPopover) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const currentX = e.clientX - rect.left;
		const currentY = e.clientY - rect.top;
		dispatch({ dragCurrent: { x: currentX, y: currentY } });
	};

	const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
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

			dispatch({
				pendingAnnotation: {
					x: pctX,
					y: pctY,
					width: pctW,
					height: pctH,
					page: pageNumber,
				},
				showCommentPopover: true,
			});
		} else {
			dispatch({ dragStart: null, dragCurrent: null });
		}
	};

	const handleSaveComment = async () => {
		if (!commentText.trim() || !onAddComment || !pendingAnnotation) return;
		try {
			dispatch({ isLoading: true });
			await onAddComment(commentText, pendingAnnotation);
			dispatch({
				commentText: "",
				showCommentPopover: false,
				pendingAnnotation: null,
				dragStart: null,
				dragCurrent: null,
				isLoading: false,
			});
		} catch (err) {
			dispatch({
				error: (err as Error).message || "Failed to save comment",
				isLoading: false,
			});
		}
	};

	const handleCancelComment = () => {
		dispatch({
			commentText: "",
			showCommentPopover: false,
			pendingAnnotation: null,
			dragStart: null,
			dragCurrent: null,
		});
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
		(width * scale) / (lastRendered.width * lastRendered.scale || 1);

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

	const textLayerStyle: React.CSSProperties = {
		position: "absolute",
		top: 0,
		left: 0,
		width: `${width * scale}px`,
		height: `${width * aspectRatio * scale}px`,
		zIndex: 10,
		pointerEvents: toolMode === "hand" ? "auto" : "none",
	};

	return (
		<div
			className="relative flex items-center justify-center bg-background rounded shadow-sm overflow-hidden"
			style={{
				width: width * scale,
				height: width * aspectRatio * scale,
			}}
		>
			<canvas ref={canvasRef1} style={canvas1Style} />
			<canvas ref={canvasRef2} style={canvas2Style} />

			{/* Text Layer for Selection */}
			<div ref={textLayerRef} className="textLayer" style={textLayerStyle} />

			{/* Interactive Overlay Layer */}
			<button
				type="button"
				ref={overlayRef}
				style={overlayStyle}
				aria-label="PDF Interaction Overlay"
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
			>
				{dragBoxStyle && <div style={dragBoxStyle} />}
			</button>

			{/* Render existing comments highlights (hoverable in hand mode) */}
			<CommentHighlights comments={comments} />

			{/* Comment creation popover */}
			{showCommentPopover && (
				<CommentCreationPopover
					pendingAnnotation={pendingAnnotation}
					pageNumber={pageNumber}
					commentText={commentText}
					onCommentTextChange={(val) => dispatch({ commentText: val })}
					onSave={handleSaveComment}
					onCancel={handleCancelComment}
				/>
			)}

			{(!hasRendered || isLoading) && (
				<div
					className={`absolute inset-0 flex items-center justify-center bg-muted/80 ${!hasRendered ? "animate-pulse" : ""}`}
				>
					{!hasRendered && (
						<div className="size-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
					)}
				</div>
			)}
			{error && (
				<div className="absolute inset-0 flex items-center justify-center text-xs text-red-500 bg-muted p-4 text-center">
					{error}
				</div>
			)}
		</div>
	);
}
