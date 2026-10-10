import { describe, expect, it } from "vitest";
import {
	getAvatarExtension,
	getProposalDocumentFilename,
	isPdfFile,
	sanitizeFilename,
} from "./file.service.js";

function file(bytes: number[], type: string, name = "upload.bin"): File {
	return new File([new Uint8Array(bytes)], name, { type });
}

describe("sanitizeFilename", () => {
	it("removes unsafe characters and adds a PDF extension", () => {
		expect(sanitizeFilename(" Proposal 2026 / final ")).toBe(
			"Proposal_2026_final.pdf",
		);
	});

	it("uses a safe fallback for an empty name", () => {
		expect(sanitizeFilename("///")).toBe("document.pdf");
	});

	it("does not duplicate an existing PDF extension", () => {
		expect(sanitizeFilename("proposal.PDF")).toBe("proposal.PDF");
	});
});

describe("getProposalDocumentFilename", () => {
	it("hides the generated UUID on a resubmitted proposal attachment", () => {
		expect(
			getProposalDocumentFilename(
				"proposals/proposal-1/9bd92c05-c44f-4f26-94a3-a14c86ca68df_Accomplishment-Report-FINAL.pdf",
			),
		).toBe("Accomplishment-Report-FINAL.pdf");
	});

	it("continues to hide legacy version and timestamp prefixes", () => {
		expect(
			getProposalDocumentFilename(
				"proposals/proposal-1/v2_1720000000000_9bd92c05-c44f-4f26-94a3-a14c86ca68df_Proposal_FINAL_v2.pdf",
			),
		).toBe("Proposal_FINAL_v2.pdf");
	});

	it("preserves ordinary names that do not have a generated UUID prefix", () => {
		expect(
			getProposalDocumentFilename("proposals/proposal-1/2026_FINAL_Report.pdf"),
		).toBe("2026_FINAL_Report.pdf");
	});
});

describe("isPdfFile", () => {
	it("accepts a PDF MIME type with a PDF magic header", async () => {
		expect(
			await isPdfFile(file([0x25, 0x50, 0x44, 0x46, 0x2d], "application/pdf")),
		).toBe(true);
	});

	it("rejects a MIME/signature mismatch", async () => {
		expect(
			await isPdfFile(file([0x89, 0x50, 0x4e, 0x47, 0x0d], "application/pdf")),
		).toBe(false);
	});
});

describe("getAvatarExtension", () => {
	it.each([
		{
			name: "JPEG",
			type: "image/jpeg",
			bytes: [0xff, 0xd8, 0xff],
			expected: "jpg",
		},
		{
			name: "PNG",
			type: "image/png",
			bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
			expected: "png",
		},
		{
			name: "WebP",
			type: "image/webp",
			bytes: [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
			expected: "webp",
		},
	])("recognizes $name signatures", async ({ type, bytes, expected }) => {
		expect(await getAvatarExtension(file(bytes, type))).toBe(expected);
	});

	it("rejects an image with the wrong declared MIME type", async () => {
		expect(
			await getAvatarExtension(file([0xff, 0xd8, 0xff], "image/png")),
		).toBeNull();
	});
});
