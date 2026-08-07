CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "search_document" "tsvector" GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce("authored_title", '')), 'A')
        || setweight(to_tsvector('english', coalesce("note_markdown", '')), 'B')
        || setweight(to_tsvector('english', coalesce("original_url", '')), 'D')
        || setweight(to_tsvector('english', coalesce("normalized_url", '')), 'D')
      ) STORED;--> statement-breakpoint
CREATE INDEX "items_search_document_gin_idx" ON "items" USING gin ("search_document");--> statement-breakpoint
CREATE INDEX "items_authored_title_trgm_idx" ON "items" USING gin (coalesce("authored_title", '') gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "items_normalized_url_trgm_idx" ON "items" USING gin (coalesce("normalized_url", '') gin_trgm_ops);