ALTER TABLE "enrichment_jobs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "enrichment_retry_rate_limits" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "item_enrichments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "enrichment_jobs" CASCADE;--> statement-breakpoint
DROP TABLE "enrichment_retry_rate_limits" CASCADE;--> statement-breakpoint
DROP TABLE "item_enrichments" CASCADE;--> statement-breakpoint
ALTER TABLE "items" DROP CONSTRAINT "items_pin_requires_active_status";--> statement-breakpoint
ALTER TABLE "items" DROP CONSTRAINT "items_trashed_at_matches_status";--> statement-breakpoint
DROP INDEX "items_owner_status_created_id_idx";--> statement-breakpoint
DROP INDEX "items_owner_active_normalized_url_idx";--> statement-breakpoint
DROP INDEX "items_trashed_at_idx";--> statement-breakpoint
DROP INDEX "items_owner_status_pinned_created_id_idx";--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "items" SET "status" = 'library' WHERE "status" = 'inbox';--> statement-breakpoint
DROP TYPE "public"."item_status";--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('library', 'archived', 'trashed');--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "status" SET DATA TYPE "public"."item_status" USING "status"::"public"."item_status";--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "status" SET DEFAULT 'library'::"public"."item_status";--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_pin_requires_active_status" CHECK ("items"."pinned_at" is null or "items"."status" = 'library');--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_trashed_at_matches_status" CHECK ((
  ("items"."status" = 'trashed' and "items"."trashed_at" is not null)
  or
  ("items"."status" <> 'trashed' and "items"."trashed_at" is null)
));--> statement-breakpoint
CREATE INDEX "items_owner_status_created_id_idx" ON "items" USING btree ("owner_id","status","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "items_owner_active_normalized_url_idx" ON "items" USING btree ("owner_id","normalized_url") WHERE "items"."normalized_url" is not null and "items"."status" <> 'trashed';--> statement-breakpoint
CREATE INDEX "items_trashed_at_idx" ON "items" USING btree ("trashed_at","id") WHERE "items"."status" = 'trashed' and "items"."trashed_at" is not null;--> statement-breakpoint
CREATE INDEX "items_owner_status_pinned_created_id_idx" ON "items" USING btree ("owner_id","status","pinned_at" DESC NULLS LAST,"created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "items"."pinned_at" is not null;--> statement-breakpoint
DROP TYPE "public"."enrichment_job_status";--> statement-breakpoint
DROP TYPE "public"."enrichment_state";
