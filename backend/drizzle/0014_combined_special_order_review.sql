ALTER TABLE "special_orders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "special_orders" CASCADE;--> statement-breakpoint
ALTER TABLE "proposal_documents" DROP CONSTRAINT "pd_proposal_version_unique";--> statement-breakpoint
ALTER TABLE "proposal_documents" ADD COLUMN "document_type" varchar(30) DEFAULT 'Proposal' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposal_submissions" ADD COLUMN "special_order_document_id" uuid;--> statement-breakpoint
ALTER TABLE "proposal_submissions" ADD CONSTRAINT "proposal_submissions_special_order_document_id_proposal_documents_document_id_fk" FOREIGN KEY ("special_order_document_id") REFERENCES "public"."proposal_documents"("document_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_documents" ADD CONSTRAINT "pd_proposal_version_unique" UNIQUE("proposal_id","document_type","version_num");