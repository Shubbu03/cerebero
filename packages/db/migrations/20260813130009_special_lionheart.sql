CREATE TABLE "extension_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"scopes" text[] NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "extension_sessions_token_hash_length" CHECK (length("extension_sessions"."token_hash") = 64),
	CONSTRAINT "extension_sessions_scope_required" CHECK (cardinality("extension_sessions"."scopes") > 0)
);
--> statement-breakpoint
ALTER TABLE "extension_sessions" ADD CONSTRAINT "extension_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "extension_sessions_token_hash_idx" ON "extension_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "extension_sessions_user_created_idx" ON "extension_sessions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "extension_sessions_expiry_idx" ON "extension_sessions" USING btree ("expires_at") WHERE "extension_sessions"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "account_providerId_accountId_idx" ON "account" USING btree ("provider_id","account_id");