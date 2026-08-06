CREATE TABLE "enrichment_retry_rate_limits" (
	"owner_id" text NOT NULL,
	"request_count" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	CONSTRAINT "enrichment_retry_rate_limits_owner_id_pk" PRIMARY KEY("owner_id"),
	CONSTRAINT "enrichment_retry_rate_limits_count_positive" CHECK ("enrichment_retry_rate_limits"."request_count" > 0)
);
--> statement-breakpoint
ALTER TABLE "enrichment_retry_rate_limits" ADD CONSTRAINT "enrichment_retry_rate_limits_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;