import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const normalizeTagName = (name: string) => name.trim().toLowerCase();

const toTagDto = (tag: any) => ({
  id: tag._id,
  name: tag.name,
  userId: tag.userId,
  createdAt: tag.createdAt,
  updatedAt: tag.updatedAt,
});

export const listByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user_name", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();

    return tags.map(toTagDto);
  },
});

export const createForUser = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const name = normalizeTagName(args.name);

    const existing = await ctx.db
      .query("tags")
      .withIndex("by_user_name", (q) => q.eq("userId", args.userId).eq("name", name))
      .first();

    if (existing) {
      return {
        status: "existing" as const,
        tag: toTagDto(existing),
      };
    }

    const now = Date.now();

    const tagId = await ctx.db.insert("tags", {
      userId: args.userId,
      name,
      createdAt: now,
      updatedAt: now,
    });

    const created = await ctx.db.get(tagId);

    if (!created) {
      throw new Error("TAG_CREATE_FAILED");
    }

    return {
      status: "created" as const,
      tag: toTagDto(created),
    };
  },
});

export const updateForUser = mutation({
  args: {
    userId: v.string(),
    tagId: v.id("tags"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.tagId);

    if (!tag || tag.userId !== args.userId) {
      return {
        status: "not_found" as const,
      };
    }

    const name = normalizeTagName(args.name);

    const duplicate = await ctx.db
      .query("tags")
      .withIndex("by_user_name", (q) => q.eq("userId", args.userId).eq("name", name))
      .first();

    if (duplicate && duplicate._id !== args.tagId) {
      return {
        status: "conflict" as const,
      };
    }

    const updatedAt = Date.now();

    await ctx.db.patch(args.tagId, {
      name,
      updatedAt,
    });

    const updated = await ctx.db.get(args.tagId);

    if (!updated) {
      throw new Error("TAG_UPDATE_FAILED");
    }

    return {
      status: "updated" as const,
      tag: toTagDto(updated),
    };
  },
});

export const deleteForUser = mutation({
  args: {
    userId: v.string(),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.tagId);

    if (!tag || tag.userId !== args.userId) {
      return {
        status: "not_found" as const,
      };
    }

    const relations = await ctx.db
      .query("contentTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
      .collect();

    for (const relation of relations) {
      await ctx.db.delete(relation._id);
    }

    await ctx.db.delete(args.tagId);

    return {
      status: "deleted" as const,
    };
  },
});

export const attachToContent = mutation({
  args: {
    userId: v.string(),
    contentId: v.string(),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.tagId);

    if (!tag) {
      return { status: "tag_not_found" as const };
    }

    if (tag.userId !== args.userId) {
      return { status: "forbidden" as const };
    }

    const existing = await ctx.db
      .query("contentTags")
      .withIndex("by_user_content_tag", (q) =>
        q.eq("userId", args.userId)
          .eq("contentId", args.contentId)
          .eq("tagId", args.tagId)
      )
      .first();

    if (existing) {
      return { status: "exists" as const };
    }

    await ctx.db.insert("contentTags", {
      userId: args.userId,
      contentId: args.contentId,
      tagId: args.tagId,
      createdAt: Date.now(),
    });

    return { status: "attached" as const };
  },
});

export const detachFromContent = mutation({
  args: {
    userId: v.string(),
    contentId: v.string(),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.tagId);

    if (!tag) {
      return { status: "tag_not_found" as const };
    }

    if (tag.userId !== args.userId) {
      return { status: "forbidden" as const };
    }

    const relation = await ctx.db
      .query("contentTags")
      .withIndex("by_user_content_tag", (q) =>
        q.eq("userId", args.userId)
          .eq("contentId", args.contentId)
          .eq("tagId", args.tagId)
      )
      .first();

    if (!relation) {
      return { status: "missing" as const };
    }

    await ctx.db.delete(relation._id);

    return { status: "detached" as const };
  },
});

export const listByContent = query({
  args: {
    userId: v.string(),
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    const relations = await ctx.db
      .query("contentTags")
      .withIndex("by_user_content", (q) =>
        q.eq("userId", args.userId).eq("contentId", args.contentId)
      )
      .collect();

    const tags = await Promise.all(
      relations.map(async (relation) => {
        const tag = await ctx.db.get(relation.tagId);
        if (!tag || tag.userId !== args.userId) {
          return null;
        }
        return {
          id: tag._id,
          name: tag.name,
        };
      })
    );

    return tags.filter((tag): tag is { id: string; name: string } => Boolean(tag));
  },
});

export const getTopWithContent = query({
  args: {
    userId: v.string(),
    tagLimit: v.number(),
    contentLimit: v.number(),
  },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user_name", (q) => q.eq("userId", args.userId))
      .collect();

    const scored = await Promise.all(
      tags.map(async (tag) => {
        const relations = await ctx.db
          .query("contentTags")
          .withIndex("by_user_tag_created", (q) =>
            q.eq("userId", args.userId).eq("tagId", tag._id)
          )
          .order("desc")
          .collect();

        const selectedRelations = relations.slice(0, args.contentLimit);

        const content = selectedRelations.map((relation) => ({
          id: relation.contentId,
          // Content endpoint is migrating next; keep contract now.
          title: relation.contentId,
          url: null,
          created_at: new Date(relation.createdAt).toISOString(),
          updated_at: new Date(relation.createdAt).toISOString(),
        }));

        return {
          tagId: tag._id,
          tagName: tag.name,
          usageCount: relations.length,
          content,
        };
      })
    );

    return scored
      .sort((a, b) => {
        if (b.usageCount !== a.usageCount) {
          return b.usageCount - a.usageCount;
        }
        return a.tagName.localeCompare(b.tagName);
      })
      .slice(0, args.tagLimit);
  },
});
