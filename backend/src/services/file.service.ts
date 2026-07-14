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

export type AvatarExtension = "jpg" | "png" | "webp";

export async function getAvatarExtension(
	file: File,
): Promise<AvatarExtension | null> {
	const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());

	if (
		file.type === "image/jpeg" &&
		header[0] === 0xff &&
		header[1] === 0xd8 &&
		header[2] === 0xff
	) {
		return "jpg";
	}

	if (
		file.type === "image/png" &&
		header[0] === 0x89 &&
		header[1] === 0x50 &&
		header[2] === 0x4e &&
		header[3] === 0x47 &&
		header[4] === 0x0d &&
		header[5] === 0x0a &&
		header[6] === 0x1a &&
		header[7] === 0x0a
	) {
		return "png";
	}

	if (
		file.type === "image/webp" &&
		String.fromCharCode(...header.slice(0, 4)) === "RIFF" &&
		String.fromCharCode(...header.slice(8, 12)) === "WEBP"
	) {
		return "webp";
	}

	return null;
}
