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

export async function isPdfFile(file: File): Promise<boolean> {
	if (file.type !== "application/pdf" || file.size < 5) return false;

	const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
	return (
		header[0] === 0x25 &&
		header[1] === 0x50 &&
		header[2] === 0x44 &&
		header[3] === 0x46 &&
		header[4] === 0x2d
	);
}
