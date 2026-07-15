import { createHash } from "node:crypto";

export async function hashFileSha256(file: File): Promise<string> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	return createHash("sha256").update(bytes).digest("hex");
}
