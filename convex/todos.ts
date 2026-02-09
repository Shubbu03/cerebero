import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const todoShape = (doc: any) => ({
  id: doc._id,
  title: doc.title,
  completed: doc.completed,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const listByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("todos")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();

    return docs.map(todoShape);
  },
});

export const createForUser = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const todoId = await ctx.db.insert("todos", {
      userId: args.userId,
      title: args.title,
      completed: false,
      createdAt: now,
      updatedAt: now,
    });

    const created = await ctx.db.get(todoId);

    if (!created) {
      throw new Error("Failed to create todo");
    }

    return todoShape(created);
  },
});

export const deleteForUser = mutation({
  args: {
    userId: v.string(),
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.todoId);

    if (!existing || existing.userId !== args.userId) {
      return { deleted: false };
    }

    await ctx.db.delete(args.todoId);

    return { deleted: true };
  },
});

export const toggleForUser = mutation({
  args: {
    userId: v.string(),
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.todoId);

    if (!existing || existing.userId !== args.userId) {
      return null;
    }

    const updatedAt = Date.now();

    await ctx.db.patch(args.todoId, {
      completed: !existing.completed,
      updatedAt,
    });

    return {
      id: args.todoId,
      title: existing.title,
      completed: !existing.completed,
      createdAt: existing.createdAt,
      updatedAt,
    };
  },
});
