// Polyfill for PDF.js server-side rendering (SSR) evaluation.
// pdfjs-dist displays reference DOMMatrix at module evaluation time.
if (typeof window === "undefined") {
	class DOMMatrixReadOnly {
		a = 1;
		b = 0;
		c = 0;
		d = 1;
		e = 0;
		f = 0;
		// Add basic properties to avoid simple checks crashing
		get is2D() {
			return true;
		}
		get isIdentity() {
			return true;
		}
	}
	class DOMMatrix extends DOMMatrixReadOnly {}

	(globalThis as any).DOMMatrix = DOMMatrix;
	(globalThis as any).DOMMatrixReadOnly = DOMMatrixReadOnly;
}
