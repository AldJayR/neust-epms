"use client";

import {
	ChevronLeft,
	ChevronRight,
	Minus,
	Plus,
	RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const DEFAULT_SCALE = 1;
const BASE_WIDTH = 650;
const BUFFER_PAGES = 1;

interface PdfInnerProps {
	url: string;
}

function VirtualPage({
	pageNumber,
	width,
	scale,
	renderedScale,
	isVisible,
}: {
	pageNumber: number;
	width: number;
	scale: number;
	renderedScale: number;
	isVisible: boolean;
}) {
	const aspectRatio = Math.SQRT2;

	return (
		<div
			className="flex justify-center"
			style={{
				minHeight: width * aspectRatio * scale,
				contain: "layout paint",
			}}
		>
			{isVisible ? (
				<Page
					pageNumber={pageNumber}
					width={width}
					scale={renderedScale}
					devicePixelRatio={Math.min(
						typeof window !== "undefined" ? window.devicePixelRatio : 1,
						1.5,
					)}
					renderAnnotationLayer={false}
					renderTextLayer={false}
					className="rounded shadow-sm"
					loading={
						<div
							className="rounded bg-[#f5f5f5] animate-pulse flex items-center justify-center"
							style={{
								width: width * scale,
								height: width * aspectRatio * scale,
							}}
						>
							<div className="size-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
						</div>
					}
				/>
			) : (
				<div
					className="rounded bg-[#f5f5f5] animate-pulse"
					style={{
						width: width * scale,
						height: width * aspectRatio * scale,
					}}
				/>
			)}
		</div>
	);
}

export default function PdfInner({ url }: PdfInnerProps) {
	const [numPages, setNumPages] = useState(0);
	const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
	const [currentPage, setCurrentPage] = useState(1);
	const [scale, setScale] = useState(DEFAULT_SCALE);
	const [renderedScale, setRenderedScale] = useState(DEFAULT_SCALE);
	const [pageWidth, setPageWidth] = useState(BASE_WIDTH);
	const [error, setError] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

	// Advanced document loading options optimized for heavy files
	const documentOptions = useMemo(
		() => ({
			cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
			cMapPacked: true,
			standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
			// Disable preloading of all pages in the background; fetch pages on-demand only
			disableAutoFetch: true,
			// Enable byte range requests to stream parts of the PDF dynamically
			disableRange: false,
			disableStream: false,
		}),
		[],
	);

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



	const onDocumentLoadSuccess = useCallback(
		({ numPages: next }: { numPages: number }) => {
			setNumPages(next);
			setVisiblePages(new Set([1]));
			setCurrentPage(1);
		},
		[],
	);

	function onDocumentLoadError(err: Error) {
		setError(err.message);
	}

	useEffect(() => {
		const scrollEl = scrollRef.current;
		if (!scrollEl || numPages === 0) return;

		// Preloading observer (virtualization)
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

		for (const [, el] of pageRefs.current) {
			preloadObserver.observe(el);
			pageTrackerObserver.observe(el);
		}

		return () => {
			preloadObserver.disconnect();
			pageTrackerObserver.disconnect();
		};
	}, [numPages]);

	function scrollToPage(pg: number) {
		const el = pageRefs.current.get(pg);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}

	function changePage(offset: number) {
		const next = Math.min(Math.max(currentPage + offset, 1), numPages);
		setCurrentPage(next);
		scrollToPage(next);
	}

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

	return (
		<div className="flex flex-col h-full w-full">
			<Document
				file={url}
				options={documentOptions}
				onLoadSuccess={onDocumentLoadSuccess}
				onLoadError={onDocumentLoadError}
				loading={
					<div className="flex flex-1 items-center justify-center">
						<div className="size-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
					</div>
				}
			>
				<div
					ref={scrollRef}
					className="flex flex-1 flex-col items-center gap-4 overflow-auto p-4"
				>
					{Array.from({ length: numPages }, (_, i) => {
						const pg = i + 1;
						return (
							<div
								key={pg}
								ref={(el) => {
									if (el) pageRefs.current.set(pg, el);
									else pageRefs.current.delete(pg);
								}}
								data-page={pg}
							>
								<VirtualPage
									pageNumber={pg}
									width={pageWidth}
									scale={scale}
									renderedScale={renderedScale}
									isVisible={visiblePages.has(pg)}
								/>
							</div>
						);
					})}
				</div>
			</Document>

			<div className="flex items-center justify-between border-t border-[#ebebeb] bg-white px-4 py-2">
				{/* Page navigation */}
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						className="size-8 rounded-[8px] border-[#e5e5e5]"
						onClick={() => changePage(-1)}
						disabled={currentPage <= 1}
					>
						<ChevronLeft className="size-4" />
					</Button>
					<span className="text-[13px] text-[#666] tabular-nums min-w-[60px] text-center">
						{currentPage} / {numPages || "–"}
					</span>
					<Button
						variant="outline"
						size="icon"
						className="size-8 rounded-[8px] border-[#e5e5e5]"
						onClick={() => changePage(1)}
						disabled={currentPage >= numPages}
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>

				{/* Zoom controls */}
				<div className="flex items-center gap-1.5">
					<Button
						variant="outline"
						size="icon"
						className="size-8 rounded-[8px] border-[#e5e5e5]"
						onClick={zoomOut}
						disabled={scale <= ZOOM_STEPS[0]}
					>
						<Minus className="size-3.5" />
					</Button>
					<button
						type="button"
						onClick={resetZoom}
						className="text-[13px] text-[#666] tabular-nums w-[48px] text-center hover:text-[#11215a] cursor-pointer"
					>
						{Math.round(scale * 100)}%
					</button>
					<Button
						variant="outline"
						size="icon"
						className="size-8 rounded-[8px] border-[#e5e5e5]"
						onClick={zoomIn}
						disabled={scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
					>
						<Plus className="size-3.5" />
					</Button>
					{scale !== DEFAULT_SCALE && (
						<Button
							variant="ghost"
							size="icon"
							className="size-8 rounded-[8px] text-[#666] hover:text-[#11215a]"
							onClick={resetZoom}
						>
							<RotateCcw className="size-3.5" />
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
