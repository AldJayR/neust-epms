import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { proposalDocuments } from "./proposal-documents.js";
import { users } from "./users.js";

/** Spatial annotation coordinate stored in JSONB */
interface AnnotationData {
	/** X position on the PDF page */
	x: number;
	/** Y position on the PDF page */
	y: number;
	/** Width of the highlight area */
	width: number;
	/** Height of the highlight area */
	height: number;
	/** Page number within the PDF */
	page: number;
}

/**
 * Proposal comments / annotation engine.
 * Binds comments to a specific document version for spatial PDF highlights.
 * Proposal is derived via documentId → proposal_documents.proposal_id.
 */
export const proposalComments = pgTable(
	"proposal_comments",
	{
		commentId: uuid("comment_id").primaryKey().defaultRandom(),
		documentId: uuid("document_id")
			.notNull()
			.references(() => proposalDocuments.documentId),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.userId),
		content: text("content").notNull(),
		annotationJson: jsonb("annotation_json").$type<AnnotationData | null>(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		documentIdx: index("pc_document_id_idx").on(table.documentId),
		userIdx: index("pc_user_id_idx").on(table.userId),
	}),
);

export type { AnnotationData };
