import "./pdf-ssr-polyfill";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePdfDocument } from "./hooks/use-pdf-document";
import { PdfPageCanvas } from "./pdf-canvas";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

function VisiblePage({
	pdfDoc,
	pageNumber,
	width,
	pageRatios,
	scrollRoot,
}: {
	pdfDoc: pdfjsLib.PDFDocumentProxy;
	pageNumber: number;
	width: number;
	pageRatios: Map<number, number>;
	scrollRoot: React.RefObject<HTMLElement | null>;
}) {
	const pageRef = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);
	const [aspectRatio, setAspectRatio] = useState(
		pageRatios.get(pageNumber) ?? Math.SQRT2,
	);

	useEffect(() => {
		const element = pageRef.current;
		if (!element) return;
		const observer = new IntersectionObserver(
			([entry]) => setVisible(entry.isIntersecting),
			{ root: scrollRoot.current, rootMargin: "300px 0px" },
		);
		observer.observe(element);
		return () => observer.disconnect();
	}, [scrollRoot]);

	useEffect(() => {
		if (!visible) return;
		let cancelled = false;
		let loadedPage: pdfjsLib.PDFPageProxy | undefined;
		void pdfDoc
			.getPage(pageNumber)
			.then((page) => {
				loadedPage = page;
				if (cancelled) {
					page.cleanup();
					return;
				}
				const viewport = page.getViewport({ scale: 1 });
				const ratio = viewport.height / viewport.width;
				pageRatios.set(pageNumber, ratio);
				setAspectRatio(ratio);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
			loadedPage?.cleanup();
		};
	}, [pdfDoc, pageNumber, visible, pageRatios]);

	return (
		<div ref={pageRef} style={{ width, height: width * aspectRatio }}>
			{visible ? (
				<PdfPageCanvas
					pdfDoc={pdfDoc}
					pageNumber={pageNumber}
					width={width}
					scale={1}
					aspectRatio={aspectRatio}
					toolMode="hand"
					comments={[]}
				/>
			) : (
				<div className="h-full rounded bg-background shadow-sm" />
			)}
		</div>
	);
}

export default function SpecialOrderPages({
	url,
	width,
	pageRatios,
	placeholderHeight,
	scrollRoot,
	onRetry,
}: {
	url: string;
	width: number;
	pageRatios: Map<number, number>;
	placeholderHeight: number;
	scrollRoot: React.RefObject<HTMLElement | null>;
	onRetry: () => void;
}) {
	// disableAutoFetch only takes effect when streaming is disabled too.
	const { pdfDoc, numPages, loadingDoc, error } = usePdfDocument(url, true);
	if (error) {
		return (
			<div role="alert" className="p-6 text-center space-y-3">
				<p className="text-sm">Unable to display this PDF.</p>
				<Button variant="outline" onClick={onRetry}>
					Retry
				</Button>
			</div>
		);
	}
	if (loadingDoc || !pdfDoc)
		return (
			<p
				role="status"
				style={{ height: placeholderHeight }}
				className="p-6 text-center text-sm"
			>
				Loading PDF pages…
			</p>
		);
	return (
		<div data-pdf-pages className="flex flex-col items-center gap-4 p-4">
			{Array.from({ length: numPages }, (_, index) => index + 1).map(
				(pageNumber) => (
					<VisiblePage
						key={pageNumber}
						pdfDoc={pdfDoc}
						pageNumber={pageNumber}
						width={width}
						pageRatios={pageRatios}
						scrollRoot={scrollRoot}
					/>
				),
			)}
		</div>
	);
}
