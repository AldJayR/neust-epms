CREATE TABLE "extension_services" (
	"extension_service_id" serial PRIMARY KEY NOT NULL,
	"service_name" varchar(100) NOT NULL,
	CONSTRAINT "extension_services_service_name_unique" UNIQUE("service_name")
);
--> statement-breakpoint
INSERT INTO "extension_services" ("service_name") VALUES
	('Capacity-Building'),
	('Technical Assistance'),
	('Consultancy Services')
ON CONFLICT ("service_name") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "proposal_extension_services" (
	"proposal_id" uuid NOT NULL,
	"extension_service_id" integer NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "proposal_extension_services_proposal_id_extension_service_id_pk" PRIMARY KEY("proposal_id","extension_service_id")
);
--> statement-breakpoint
ALTER TABLE "proposal_extension_services" ADD CONSTRAINT "proposal_extension_services_proposal_id_proposals_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("proposal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_extension_services" ADD CONSTRAINT "proposal_extension_services_extension_service_id_extension_services_extension_service_id_fk" FOREIGN KEY ("extension_service_id") REFERENCES "public"."extension_services"("extension_service_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposal_extension_services_proposal_id_idx" ON "proposal_extension_services" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "proposal_extension_services_service_id_idx" ON "proposal_extension_services" USING btree ("extension_service_id");--> statement-breakpoint
CREATE INDEX "proposal_extension_services_active_proposal_id_idx" ON "proposal_extension_services" USING btree ("proposal_id") WHERE "proposal_extension_services"."archived_at" IS NULL;--> statement-breakpoint
ALTER TABLE "proposals" DROP COLUMN "extension_category";
