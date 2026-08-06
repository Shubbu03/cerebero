CREATE TYPE "public"."item_status" AS ENUM('inbox', 'library', 'archived', 'trashed');--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"original_url" text,
	"normalized_url" text,
	"authored_title" text,
	"note_markdown" text,
	"status" "item_status" DEFAULT 'inbox' NOT NULL,
	"pinned_at" timestamp with time zone,
	"trashed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_content_required" CHECK ((
        ("items"."original_url" is not null and length(btrim("items"."original_url")) > 0)
        or
        ("items"."note_markdown" is not null and length(btrim("items"."note_markdown")) > 0)
      )),
	CONSTRAINT "items_pin_requires_active_status" CHECK ("items"."pinned_at" is null or "items"."status" in ('inbox', 'library')),
	CONSTRAINT "items_trashed_at_matches_status" CHECK ((
        ("items"."status" = 'trashed' and "items"."trashed_at" is not null)
        or
        ("items"."status" <> 'trashed' and "items"."trashed_at" is null)
      )),
	CONSTRAINT "items_version_positive" CHECK ("items"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_owner_status_created_id_idx" ON "items" USING btree ("owner_id","status","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "items_owner_active_normalized_url_idx" ON "items" USING btree ("owner_id","normalized_url") WHERE "items"."normalized_url" is not null and "items"."status" <> 'trashed';