import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useReducer } from "react";
import { stateReducer } from "@/lib/state-reducer";

interface DocState {
	pdfDoc: pdfjsLib.PDFDocumentProxy | null;
	numPages: number;
	loadingDoc: boolean;
	error: string | null;
}

const initialState: DocState = {
	pdfDoc: null,
	numPages: 0,
	loadingDoc: true,
	error: null,
};

export function usePdfDocument(url: string) {
	const [state, dispatch] = useReducer(stateReducer, initialState);

	useEffect(() => {
		if (!url) {
			dispatch({ pdfDoc: null, numPages: 0, loadingDoc: false, error: null });
			return;
		}

		let isDestroyed = false;
		let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

		const loadDocument = async () => {
			try {
				dispatch({ loadingDoc: true, error: null });

				loadingTask = pdfjsLib.getDocument({
					url,
					cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
					cMapPacked: true,
					standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
					disableAutoFetch: true,
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
					loadingDoc: false,
				});
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

	return {
		pdfDoc: state.pdfDoc,
		numPages: state.numPages,
		loadingDoc: state.loadingDoc,
		error: state.error,
	};
}
