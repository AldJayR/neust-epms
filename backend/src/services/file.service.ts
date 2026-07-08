export function sanitizeFilename(fileName: string): string {
	const normalized = fileName
		.normalize("NFKD")
		.replace(/[^a-zA-Z0-9._-]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "");

	const fallback = "document.pdf";
	const candidate = normalized.length > 0 ? normalized : fallback;

	return candidate.toLowerCase().endsWith(".pdf")
		? candidate
		: `${candidate}.pdf`;
}
