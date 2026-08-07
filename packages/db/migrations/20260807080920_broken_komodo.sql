CREATE TABLE "item_tags" (
	"item_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_tags_item_id_tag_id_pk" PRIMARY KEY("item_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_nonempty" CHECK (length(btrim("tags"."name")) > 0 and length("tags"."name") <= 64),
	CONSTRAINT "tags_normalized_name_matches" CHECK ("tags"."normalized_name" = lower(btrim("tags"."name")))
);
--> statement-breakpoint
ALTER TABLE "item_tags" ADD CONSTRAINT "item_tags_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_tags" ADD CONSTRAINT "item_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_tags" ADD CONSTRAINT "item_tags_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_tags_owner_tag_item_idx" ON "item_tags" USING btree ("owner_id","tag_id","item_id");--> statement-breakpoint
CREATE INDEX "item_tags_owner_item_tag_idx" ON "item_tags" USING btree ("owner_id","item_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_owner_normalized_name_unique" ON "tags" USING btree ("owner_id","normalized_name");--> statement-breakpoint
CREATE INDEX "tags_owner_created_id_idx" ON "tags" USING btree ("owner_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);