import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const contentType = v.union(
  v.literal("document"),
  v.literal("tweet"),
  v.literal("youtube"),
  v.literal("link")
);

const inputItemSchema = v.object({
  type: contentType,
  title: v.string(),
  url: v.optional(v.string()),
  body: v.optional(v.string()),
});

const toContentDto = (doc: any) => ({
  id: doc._id,
  userId: doc.userId,
  title: doc.title,
  type: doc.type,
  url: doc.url ?? null,
  body: doc.body ?? null,
  isShared: doc.isShared,
  isFavourite: doc.isFavourite,
  shareId: doc.shareId ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const normalizeText = (value: string) => value.trim().toLowerCase();

async function getOwnedContent(
  ctx: any,
  userId: string,
  contentId: string
) {
  const normalizedId = ctx.db.normalizeId("content", contentId);

  if (!normalizedId) {
    return null;
  }

  const content = await ctx.db.get(normalizedId);

  if (!content || content.userId !== userId) {
    return null;
  }

  return content;
}

export const listByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const content = await ctx.db
      .query("content")
      .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return content.map(toContentDto);
  },
});

export const listFavouritesByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const content = await ctx.db
      .query("content")
      .withIndex("by_user_favourite", (q) =>
        q.eq("userId", args.userId).eq("isFavourite", true)
      )
      .order("desc")
      .collect();

    return content.map(toContentDto);
  },
});

export const getByIdForUser = query({
  args: {
    userId: v.string(),
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    const content = await getOwnedContent(ctx, args.userId, args.contentId);
    return content ? toContentDto(content) : null;
  },
});

export const createForUser = mutation({
  args: {
    userId: v.string(),
    type: contentType,
    title: v.string(),
    url: v.optional(v.string()),
    body: v.optional(v.string()),
    isShared: v.optional(v.boolean()),
    isFavourite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const contentId = await ctx.db.insert("content", {
      userId: args.userId,
      title: args.title.trim(),
      type: args.type,
      url: args.url?.trim() || undefined,
      body: args.body || undefined,
      isShared: args.isShared ?? false,
      isFavourite: args.isFavourite ?? false,
      shareId: undefined,
      createdAt: now,
      updatedAt: now,
    });

    if (args.isShared) {
      await ctx.db.patch(contentId, {
        shareId: contentId,
      });
    }

    const created = await ctx.db.get(contentId);

    if (!created) {
      throw new Error("CONTENT_CREATE_FAILED");
    }

    return toContentDto(created);
  },
});

export const importForUser = mutation({
  args: {
    userId: v.string(),
    items: v.array(inputItemSchema),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const item of args.items) {
      await ctx.db.insert("content", {
        userId: args.userId,
        title: item.title.trim(),
        type: item.type,
        url: item.url?.trim() || undefined,
        body: item.body || undefined,
        isShared: false,
        isFavourite: false,
        shareId: undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { count: args.items.length };
  },
});

export const updateForUser = mutation({
  args: {
    userId: v.string(),
    contentId: v.string(),
    title: v.string(),
    type: contentType,
    url: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const content = await getOwnedContent(ctx, args.userId, args.contentId);

    if (!content) {
      return { status: "not_found" as const, content: null };
    }

    await ctx.db.patch(content._id, {
      title: args.title.trim(),
      type: args.type,
      url: args.url?.trim() || undefined,
      body: args.body || undefined,
      updatedAt: Date.now(),
    });

    const updated = await ctx.db.get(content._id);

    if (!updated) {
      throw new Error("CONTENT_UPDATE_FAILED");
    }

    return {
      status: "updated" as const,
      content: toContentDto(updated),
    };
  },
});

export const deleteForUser = mutation({
  args: {
    userId: v.string(),
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    const content = await getOwnedContent(ctx, args.userId, args.contentId);

    if (!content) {
      return { deleted: false };
    }

    const contentTags = await ctx.db
      .query("contentTags")
      .withIndex("by_user_content", (q) =>
        q.eq("userId", args.userId).eq("contentId", args.contentId)
      )
      .collect();

    for (const relation of contentTags) {
      await ctx.db.delete(relation._id);
    }

    const embeddings = await ctx.db
      .query("contentEmbeddings")
      .withIndex("by_user_content", (q) =>
        q.eq("userId", args.userId).eq("contentId", args.contentId)
      )
      .collect();

    for (const embedding of embeddings) {
      await ctx.db.delete(embedding._id);
    }

    await ctx.db.delete(content._id);

    return { deleted: true };
  },
});

export const toggleFavouriteForUser = mutation({
  args: {
    userId: v.string(),
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    const content = await getOwnedContent(ctx, args.userId, args.contentId);

    if (!content) {
      return null;
    }

    await ctx.db.patch(content._id, {
      isFavourite: !content.isFavourite,
      updatedAt: Date.now(),
    });

    const updated = await ctx.db.get(content._id);

    if (!updated) {
      throw new Error("CONTENT_TOGGLE_FAVOURITE_FAILED");
    }

    return toContentDto(updated);
  },
});

export const toggleShareForUser = mutation({
  args: {
    userId: v.string(),
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    const content = await getOwnedContent(ctx, args.userId, args.contentId);

    if (!content) {
      return null;
    }

    const isShared = !content.isShared;

    await ctx.db.patch(content._id, {
      isShared,
      shareId: isShared ? content.shareId ?? content._id : content.shareId,
      updatedAt: Date.now(),
    });

    const updated = await ctx.db.get(content._id);

    if (!updated) {
      throw new Error("CONTENT_TOGGLE_SHARE_FAILED");
    }

    return toContentDto(updated);
  },
});

export const getShareStatusForUser = query({
  args: {
    userId: v.string(),
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    const content = await getOwnedContent(ctx, args.userId, args.contentId);
    return content ? toContentDto(content) : null;
  },
});

export const getSharedByShareId = query({
  args: {
    shareId: v.string(),
  },
  handler: async (ctx, args) => {
    const content = await ctx.db
      .query("content")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!content || !content.isShared) {
      return null;
    }

    return toContentDto(content);
  },
});

export const searchByText = query({
  args: {
    userId: v.string(),
    q: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const queryText = normalizeText(args.q);

    if (!queryText) {
      return [];
    }

    const content = await ctx.db
      .query("content")
      .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const matches = content.filter((item) => {
      const title = normalizeText(item.title);
      const body = normalizeText(item.body ?? "");
      return title.includes(queryText) || body.includes(queryText);
    });

    return matches.slice(0, Math.max(1, args.limit)).map(toContentDto);
  },
});

export const listEmbeddingsWithContentByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const embeddings = await ctx.db
      .query("contentEmbeddings")
      .withIndex("by_user_content", (q) => q.eq("userId", args.userId))
      .collect();

    const results = await Promise.all(
      embeddings.map(async (item) => {
        const normalizedContentId = ctx.db.normalizeId("content", item.contentId);

        if (!normalizedContentId) {
          return null;
        }

        const content = await ctx.db.get(normalizedContentId);

        if (!content || content.userId !== args.userId) {
          return null;
        }

        return {
          contentId: item.contentId,
          embedding: item.embedding,
          content: toContentDto(content),
        };
      })
    );

    return results.filter(Boolean);
  },
});

export const upsertEmbeddingForContent = mutation({
  args: {
    userId: v.string(),
    contentId: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const content = await getOwnedContent(ctx, args.userId, args.contentId);

    if (!content) {
      return { status: "content_not_found" as const };
    }

    const existing = await ctx.db
      .query("contentEmbeddings")
      .withIndex("by_user_content", (q) =>
        q.eq("userId", args.userId).eq("contentId", args.contentId)
      )
      .first();

    const now = Date.now();

    if (!existing) {
      await ctx.db.insert("contentEmbeddings", {
        userId: args.userId,
        contentId: args.contentId,
        embedding: args.embedding,
        createdAt: now,
        updatedAt: now,
      });

      return { status: "created" as const };
    }

    await ctx.db.patch(existing._id, {
      embedding: args.embedding,
      updatedAt: now,
    });

    return { status: "updated" as const };
  },
});
