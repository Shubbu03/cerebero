import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const contentType = v.union(
  v.literal("document"),
  v.literal("tweet"),
  v.literal("youtube"),
  v.literal("link")
);

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    image: v.optional(v.string()),
    provider: v.union(v.literal("credentials"), v.literal("google")),
    providerId: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  content: defineTable({
    userId: v.string(),
    title: v.string(),
    type: contentType,
    url: v.optional(v.string()),
    body: v.optional(v.string()),
    isShared: v.boolean(),
    isFavourite: v.boolean(),
    shareId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_favourite", ["userId", "isFavourite", "updatedAt"])
    .index("by_share_id", ["shareId"]),

  tags: defineTable({
    userId: v.string(),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_name", ["userId", "name"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  contentTags: defineTable({
    userId: v.string(),
    contentId: v.string(),
    tagId: v.id("tags"),
    createdAt: v.number(),
  })
    .index("by_user_content", ["userId", "contentId"])
    .index("by_user_tag", ["userId", "tagId"])
    .index("by_user_content_tag", ["userId", "contentId", "tagId"])
    .index("by_user_tag_created", ["userId", "tagId", "createdAt"])
    .index("by_tag", ["tagId"]),

  contentEmbeddings: defineTable({
    userId: v.string(),
    contentId: v.string(),
    embedding: v.array(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_content", ["userId", "contentId"]),

  todos: defineTable({
    userId: v.string(),
    title: v.string(),
    completed: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_created", ["userId", "createdAt"]),
});
