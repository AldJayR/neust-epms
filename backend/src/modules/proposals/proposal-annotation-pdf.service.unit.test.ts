import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { createAnnotatedProposalPdf } from "./proposal-annotation-pdf.service.js";

describe("createAnnotatedProposalPdf", () => {
	it("returns the source bytes when there are no comments", async () => {
		const source = await createSourcePdf();

		expect(await createAnnotatedProposalPdf(source, [])).toBe(source);
	});

	it("ignores annotations outside the source page range", async () => {
		const source = await createSourcePdf();
		const result = await createAnnotatedProposalPdf(source, [
			{
				content: "Invalid page",
				authorName: "Reviewer",
				createdAt: "not-a-date",
				annotationJson: {
					x: 10,
					y: 10,
					width: 20,
					height: 20,
					page: 2,
				},
			},
		]);

		const document = await PDFDocument.load(result);
		expect(document.getPageCount()).toBe(2);
	});

	it("creates an appendix for document-level comments", async () => {
		const source = await createSourcePdf();
		const result = await createAnnotatedProposalPdf(source, [
			{
				content: "Please add the missing implementation date.",
				authorName: "RET Chair",
				createdAt: "2026-07-19T00:00:00.000Z",
				annotationJson: null,
			},
		]);

		expect((await PDFDocument.load(result)).getPageCount()).toBe(2);
	});
});

async function createSourcePdf(): Promise<Uint8Array> {
	const document = await PDFDocument.create();
	document.addPage([612, 792]);
	return document.save();
}
