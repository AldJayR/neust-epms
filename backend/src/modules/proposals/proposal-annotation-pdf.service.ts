import {
	PDFDocument,
	rgb,
	StandardFonts,
	type PDFPage,
} from "pdf-lib";

export interface ProposalAnnotation {
	content: string;
	authorName: string;
	createdAt: string;
	annotationJson: {
		x: number;
		y: number;
		width: number;
		height: number;
		page: number;
	} | null;
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const APPENDIX_MARGIN = 48;
const BODY_FONT_SIZE = 10;
const LINE_HEIGHT = 14;

export async function createAnnotatedProposalPdf(
	source: Uint8Array,
	comments: readonly ProposalAnnotation[],
): Promise<Uint8Array> {
	if (comments.length === 0) return source;

	const document = await PDFDocument.load(source);
	const font = await document.embedFont(StandardFonts.Helvetica);
	const boldFont = await document.embedFont(StandardFonts.HelveticaBold);

	for (const [index, comment] of comments.entries()) {
		const annotation = comment.annotationJson;
		if (
			!annotation ||
			annotation.page < 1 ||
			annotation.page > document.getPageCount()
		) {
			continue;
		}

		const page = document.getPage(annotation.page - 1);
		if (!page) continue;

		const rectangle = toPdfRectangle(page, annotation);
		if (rectangle.width <= 0 || rectangle.height <= 0) continue;

		page.drawRectangle({
			x: rectangle.x,
			y: rectangle.y,
			width: rectangle.width,
			height: rectangle.height,
			color: rgb(1, 0.85, 0),
			opacity: 0.24,
			borderColor: rgb(0.75, 0.55, 0),
			borderOpacity: 0.8,
			borderWidth: 1,
		});

		page.drawText(String(index + 1), {
			x: rectangle.x + 2,
			y: rectangle.y + Math.max(rectangle.height - 10, 2),
			size: 8,
			font: boldFont,
			color: rgb(0.35, 0.25, 0),
		});
	}

	await appendAnnotationReport(document, comments, font, boldFont);
	await document.attach(
		JSON.stringify(comments, null, 2),
		"review-annotations.json",
		{
			description: "Structured proposal review annotations",
			mimeType: "application/json",
		},
	);

	return document.save();
}

function toPdfRectangle(
	page: PDFPage,
	annotation: NonNullable<ProposalAnnotation["annotationJson"]>,
) {
	const pageWidth = page.getWidth();
	const pageHeight = page.getHeight();
	const rotation = normalizeRotation(page.getRotation().angle);
	const displayWidth = rotation % 180 === 0 ? pageWidth : pageHeight;
	const displayHeight = rotation % 180 === 0 ? pageHeight : pageWidth;
	const x = clamp(annotation.x, 0, 100) * displayWidth * 0.01;
	const y = clamp(annotation.y, 0, 100) * displayHeight * 0.01;
	const width = clamp(annotation.width, 0, 100) * displayWidth * 0.01;
	const height = clamp(annotation.height, 0, 100) * displayHeight * 0.01;

	switch (rotation) {
		case 90:
			return {
				x: pageWidth - y - height,
				y: x,
				width: height,
				height: width,
			};
		case 180:
			return {
				x: pageWidth - x - width,
				y,
				width,
				height,
			};
		case 270:
			return {
				x: y,
				y: pageHeight - x - width,
				width: height,
				height: width,
			};
		default:
			return {
				x,
				y: pageHeight - y - height,
				width,
				height,
			};
	}
}

async function appendAnnotationReport(
	document: PDFDocument,
	comments: readonly ProposalAnnotation[],
	font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
	boldFont: Awaited<ReturnType<PDFDocument["embedFont"]>>,
) {
	let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	let cursorY = PAGE_HEIGHT - APPENDIX_MARGIN;

	const drawHeader = () => {
		page.drawText("Proposal Review Annotations", {
			x: APPENDIX_MARGIN,
			y: cursorY,
			size: 16,
			font: boldFont,
			color: rgb(0.12, 0.12, 0.12),
		});
		cursorY -= 28;
	};

	const ensureSpace = (height: number) => {
		if (cursorY - height >= APPENDIX_MARGIN) return;
		page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
		cursorY = PAGE_HEIGHT - APPENDIX_MARGIN;
		drawHeader();
	};

	drawHeader();

	for (const [index, comment] of comments.entries()) {
		const pageLabel = comment.annotationJson
			? `Page ${comment.annotationJson.page}`
			: "Document comment";
		const metadata = `${pageLabel} | ${toPdfText(comment.authorName)} | ${formatDate(comment.createdAt)}`;
		const lines = wrapText(
			toPdfText(comment.content),
			font,
			BODY_FONT_SIZE,
			PAGE_WIDTH - APPENDIX_MARGIN * 2 - 18,
		);
		const blockHeight = 24 + lines.length * LINE_HEIGHT + 12;
		ensureSpace(blockHeight);

		page.drawText(`${index + 1}. ${metadata}`, {
			x: APPENDIX_MARGIN,
			y: cursorY,
			size: BODY_FONT_SIZE,
			font: boldFont,
			color: rgb(0.15, 0.15, 0.15),
		});
		cursorY -= 16;

		for (const line of lines) {
			page.drawText(line, {
				x: APPENDIX_MARGIN + 14,
				y: cursorY,
				size: BODY_FONT_SIZE,
				font,
				color: rgb(0.2, 0.2, 0.2),
			});
			cursorY -= LINE_HEIGHT;
		}

		cursorY -= 12;
	}
}

function wrapText(
	text: string,
	font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
	fontSize: number,
	maxWidth: number,
): string[] {
	const words = text.split(/\s+/).filter(Boolean);
	if (words.length === 0) return ["(No comment text)"];

	const lines: string[] = [];
	let line = "";
	for (const word of words) {
		const candidate = line ? `${line} ${word}` : word;
		if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
			line = candidate;
			continue;
		}
		if (line) lines.push(line);
		line = word;
	}
	if (line) lines.push(line);
	return lines;
}

function toPdfText(text: string): string {
	return text.replace(/[^\x20-\x7E\n\t\r]/g, "?");
}

function formatDate(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

function normalizeRotation(value: number): 0 | 90 | 180 | 270 {
	const normalized = ((value % 360) + 360) % 360;
	return normalized === 90 || normalized === 180 || normalized === 270
		? normalized
		: 0;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
