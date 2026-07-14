import { useEffect } from "react";

interface UsePdfKeyboardOptions {
	zoomIn: () => void;
	zoomOut: () => void;
	resetZoom: () => void;
}

export function usePdfKeyboard({
	zoomIn,
	zoomOut,
	resetZoom,
}: UsePdfKeyboardOptions) {
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
	}, [resetZoom, zoomIn, zoomOut]);
}
