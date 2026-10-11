-- Drizzle runs migrations transactionally. Block sector/link writes while reconciling.
LOCK TABLE "beneficiary_sectors", "proposal_beneficiaries" IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;--> statement-breakpoint
ALTER TABLE "beneficiary_sectors" ADD COLUMN "normalized_key" text GENERATED ALWAYS AS (lower(btrim(regexp_replace("sector_name", '[[:space:]]+', ' ', 'g')))) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "beneficiary_sectors" ADD COLUMN "merged_into_id" integer;--> statement-breakpoint
ALTER TABLE "proposal_beneficiaries" ADD COLUMN "entered_labels" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "beneficiary_sectors" ADD CONSTRAINT "beneficiary_sectors_merged_into_id_beneficiary_sectors_sector_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."beneficiary_sectors"("sector_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Do not silently discard or invent meanings for invalid legacy entries.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM beneficiary_sectors WHERE normalized_key = '') THEN
    RAISE EXCEPTION 'Blank beneficiary sector names must be corrected before migration 0013';
  END IF;
END $$;--> statement-breakpoint
UPDATE proposal_beneficiaries pb
SET entered_labels = ARRAY[s.sector_name]
FROM beneficiary_sectors s WHERE s.sector_id = pb.sector_id;--> statement-breakpoint
CREATE TEMP TABLE sector_identity_map ON COMMIT DROP AS
SELECT sector_id AS old_id, min(sector_id) OVER (PARTITION BY normalized_key) AS canonical_id
FROM beneficiary_sectors;--> statement-breakpoint
-- Aggregate before redirecting links: a proposal may have both active and archived variants.
-- Original labels are retained; an active variant makes the surviving link active.
INSERT INTO proposal_beneficiaries (proposal_id, sector_id, archived_at, entered_labels)
SELECT pb.proposal_id, m.canonical_id,
  CASE WHEN bool_or(pb.archived_at IS NULL) THEN NULL ELSE max(pb.archived_at) END,
  array_agg(DISTINCT labels.label ORDER BY labels.label)
FROM proposal_beneficiaries pb
JOIN sector_identity_map m ON m.old_id = pb.sector_id
CROSS JOIN LATERAL unnest(pb.entered_labels) AS labels(label)
GROUP BY pb.proposal_id, m.canonical_id
ON CONFLICT (proposal_id, sector_id) DO UPDATE
SET archived_at = EXCLUDED.archived_at, entered_labels = EXCLUDED.entered_labels;--> statement-breakpoint
DELETE FROM proposal_beneficiaries pb USING sector_identity_map m
WHERE pb.sector_id = m.old_id AND m.old_id <> m.canonical_id;--> statement-breakpoint
-- Preserve old IDs/names for provenance and compatibility, but exclude them from search.
UPDATE beneficiary_sectors s SET merged_into_id = m.canonical_id
FROM sector_identity_map m WHERE s.sector_id = m.old_id AND m.old_id <> m.canonical_id;--> statement-breakpoint
CREATE UNIQUE INDEX "beneficiary_sectors_normalized_key_unique" ON "beneficiary_sectors" USING btree ("normalized_key") WHERE "beneficiary_sectors"."merged_into_id" IS NULL;--> statement-breakpoint
-- An existing pg_trgm installation may live in `extensions`, not `public`.
DO $$ DECLARE extension_schema text;
BEGIN
  SELECT n.nspname INTO extension_schema FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_trgm';
  EXECUTE format('CREATE INDEX beneficiary_sectors_search_idx ON public.beneficiary_sectors USING gin (normalized_key %I.gin_trgm_ops) WHERE merged_into_id IS NULL', extension_schema);
END $$;--> statement-breakpoint
ALTER TABLE "beneficiary_sectors" ADD CONSTRAINT "beneficiary_sectors_nonempty" CHECK ("beneficiary_sectors"."normalized_key" <> '');--> statement-breakpoint
ALTER TABLE "beneficiary_sectors" ADD CONSTRAINT "beneficiary_sectors_not_self_merged" CHECK ("beneficiary_sectors"."merged_into_id" IS NULL OR "beneficiary_sectors"."merged_into_id" <> "beneficiary_sectors"."sector_id");
