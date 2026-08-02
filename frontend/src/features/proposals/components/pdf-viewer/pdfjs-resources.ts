const appBaseUrl = import.meta.env.BASE_URL.endsWith("/")
	? import.meta.env.BASE_URL
	: `${import.meta.env.BASE_URL}/`;

const pdfjsBaseUrl = `${appBaseUrl}pdfjs/`;

export const pdfjsResourceUrls = {
	cMapUrl: `${pdfjsBaseUrl}cmaps/`,
	iccUrl: `${pdfjsBaseUrl}iccs/`,
	standardFontDataUrl: `${pdfjsBaseUrl}standard_fonts/`,
	wasmUrl: `${pdfjsBaseUrl}wasm/`,
} as const;

export function createPdfDocumentOptions(url: string) {
	return {
		url,
		...pdfjsResourceUrls,
		cMapPacked: true,
		useWasm: true,
		useWorkerFetch: true,
		disableAutoFetch: true,
		disableRange: false,
		disableStream: false,
	};
}
