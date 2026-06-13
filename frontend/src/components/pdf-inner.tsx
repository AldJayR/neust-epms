"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function PdfPage({ pageNumber, width }: { pageNumber: number; width: number }) {
	const ref = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setVisible(true);
					observer.disconnect();
				}
			},
			{ rootMargin: "400px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	return (
		<div ref={ref} className="flex justify-center">
			{visible ? (
				<Page
					pageNumber={pageNumber}
					width={width}
					className="rounded shadow-sm"
				/>
			) : (
				<div
					className="rounded bg-[#f5f5f5] animate-pulse"
					style={{ width, height: width * 1.414 }}
				/>
			)}
		</div>
	);
}

interface PdfInnerProps {
	url: string;
}

export default function PdfInner({ url }: PdfInnerProps) {
	const [numPages, setNumPages] = useState(0);
	const [error, setError] = useState<string | null>(null);

	function onDocumentLoadSuccess({ numPages: next }: { numPages: number }) {
		setNumPages(next);
	}

	function onDocumentLoadError(err: Error) {
		setError(err.message);
	}

	if (error) {
		return (
			<div className="flex h-full items-center justify-center text-[#737373]">
				{error}
			</div>
		);
	}

	const pageWidth = Math.min(650, window.innerWidth - 120);

	return (
		<Document
			file={url}
			onLoadSuccess={onDocumentLoadSuccess}
			onLoadError={onDocumentLoadError}
			loading={
				<div className="flex h-full items-center justify-center">
					<div className="size-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
				</div>
			}
		>
			{Array.from(new Array(numPages), (_, i) => (
				<PdfPage key={`page_${i + 1}`} pageNumber={i + 1} width={pageWidth} />
			))}
		</Document>
	);
}
