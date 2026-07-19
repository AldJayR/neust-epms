import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { createAnnotatedProposalPdf } from "./proposal-annotation-pdf.service.js";

describe("createAnnotatedProposalPdf", () => {
	it("returns the original document when there are no comments", async () => {
		const source = await createSourcePdf();

		const result = await createAnnotatedProposalPdf(source, []);
		const document = await PDFDocument.load(result);

		expect(document.getPageCount()).toBe(1);
	});

	it("adds highlighted annotation data and a readable review appendix", async () => {
		const source = await createSourcePdf();

		const result = await createAnnotatedProposalPdf(source, [
			{
				content: "Please clarify the beneficiary count.",
				authorName: "RET Chair",
				createdAt: "2026-07-19T00:00:00.000Z",
				annotationJson: {
					x: 10,
					y: 20,
					width: 30,
					height: 10,
					page: 1,
				},
			},
		]);
		const document = await PDFDocument.load(result);

		expect(document.getPageCount()).toBe(2);
	});
});

async function createSourcePdf(): Promise<Uint8Array> {
	const document = await PDFDocument.create();
	const page = document.addPage([612, 792]);
	page.drawText("Proposal", { x: 72, y: 720 });
	return document.save();
}
