CREATE TYPE "public"."enrichment_job_status" AS ENUM('pending', 'processing', 'completed', 'dead');--> statement-breakpoint
CREATE TYPE "public"."enrichment_state" AS ENUM('pending', 'processing', 'succeeded', 'retryable_failed', 'terminal_failed');--> statement-breakpoint
CREATE TABLE "enrichment_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"status" "enrichment_job_status" DEFAULT 'pending' NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"lease_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error_code" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrichment_jobs_attempt_count_nonnegative" CHECK ("enrichment_jobs"."attempt_count" >= 0),
	CONSTRAINT "enrichment_jobs_error_code_bounded" CHECK ("enrichment_jobs"."last_error_code" is null or length("enrichment_jobs"."last_error_code") <= 64),
	CONSTRAINT "enrichment_jobs_state_fields_consistent" CHECK ((
        (
          "enrichment_jobs"."status" = 'pending'
          and "enrichment_jobs"."claimed_at" is null
          and "enrichment_jobs"."lease_token" is null
          and "enrichment_jobs"."lease_expires_at" is null
          and "enrichment_jobs"."completed_at" is null
        )
        or
        (
          "enrichment_jobs"."status" = 'processing'
          and "enrichment_jobs"."claimed_at" is not null
          and "enrichment_jobs"."lease_token" is not null
          and "enrichment_jobs"."lease_expires_at" is not null
          and "enrichment_jobs"."completed_at" is null
        )
        or
        (
          "enrichment_jobs"."status" in ('completed', 'dead')
          and "enrichment_jobs"."claimed_at" is null
          and "enrichment_jobs"."lease_token" is null
          and "enrichment_jobs"."lease_expires_at" is null
          and "enrichment_jobs"."completed_at" is not null
        )
      ))
);
--> statement-breakpoint
CREATE TABLE "item_enrichments" (
	"item_id" uuid PRIMARY KEY NOT NULL,
	"state" "enrichment_state" DEFAULT 'pending' NOT NULL,
	"extracted_title" text,
	"description" text,
	"site_name" text,
	"canonical_url" text,
	"favicon_url" text,
	"image_url" text,
	"provider" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error_code" text,
	"next_attempt_at" timestamp with time zone,
	"enriched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_enrichments_attempt_count_nonnegative" CHECK ("item_enrichments"."attempt_count" >= 0),
	CONSTRAINT "item_enrichments_extracted_title_bounded" CHECK ("item_enrichments"."extracted_title" is null or length("item_enrichments"."extracted_title") <= 500),
	CONSTRAINT "item_enrichments_description_bounded" CHECK ("item_enrichments"."description" is null or length("item_enrichments"."description") <= 2000),
	CONSTRAINT "item_enrichments_site_name_bounded" CHECK ("item_enrichments"."site_name" is null or length("item_enrichments"."site_name") <= 200),
	CONSTRAINT "item_enrichments_urls_bounded" CHECK ((
        ("item_enrichments"."canonical_url" is null or length("item_enrichments"."canonical_url") <= 2048)
        and ("item_enrichments"."favicon_url" is null or length("item_enrichments"."favicon_url") <= 2048)
        and ("item_enrichments"."image_url" is null or length("item_enrichments"."image_url") <= 2048)
      )),
	CONSTRAINT "item_enrichments_provider_bounded" CHECK ("item_enrichments"."provider" is null or length("item_enrichments"."provider") <= 100),
	CONSTRAINT "item_enrichments_error_code_bounded" CHECK ("item_enrichments"."last_error_code" is null or length("item_enrichments"."last_error_code") <= 64)
);
--> statement-breakpoint
ALTER TABLE "enrichment_jobs" ADD CONSTRAINT "enrichment_jobs_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_enrichments" ADD CONSTRAINT "item_enrichments_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "enrichment_jobs_item_id_unique" ON "enrichment_jobs" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "enrichment_jobs_claim_idx" ON "enrichment_jobs" USING btree ("status","available_at","created_at","id");--> statement-breakpoint
CREATE INDEX "enrichment_jobs_stale_lease_idx" ON "enrichment_jobs" USING btree ("lease_expires_at") WHERE "enrichment_jobs"."status" = 'processing';--> statement-breakpoint
CREATE INDEX "item_enrichments_state_next_attempt_idx" ON "item_enrichments" USING btree ("state","next_attempt_at");