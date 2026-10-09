import { z } from "zod";

export const MAX_PDF_BYTES = 50 * 1024 * 1024;
export const pdfFileSchema = z
	.instanceof(File)
	.refine((file) => file.size > 0, "The PDF cannot be empty")
	.refine((file) => file.size <= MAX_PDF_BYTES, "PDF must be 50MB or smaller")
	.refine(
		(file) => ["application/pdf", "application/x-pdf"].includes(file.type),
		"Only PDF documents are allowed",
	);
