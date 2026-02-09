import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const providerSchema = v.union(v.literal("credentials"), v.literal("google"));

const toPublicUser = (doc: any) => ({
  id: doc._id,
  email: doc.email,
  name: doc.name,
  image: doc.image ?? null,
  provider: doc.provider,
  providerId: doc.providerId ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const getByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      return null;
    }

    return {
      ...toPublicUser(user),
      passwordHash: user.passwordHash ?? null,
    };
  },
});

export const getPublicById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return null;
    }

    return toPublicUser(user);
  },
});

export const createCredentialsUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      throw new Error("EMAIL_EXISTS");
    }

    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      email,
      name: args.name.trim(),
      image: undefined,
      provider: "credentials",
      providerId: undefined,
      passwordHash: args.passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    const created = await ctx.db.get(userId);

    if (!created) {
      throw new Error("CREATE_FAILED");
    }

    return toPublicUser(created);
  },
});

export const upsertGoogleUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    image: v.optional(v.string()),
    providerId: v.string(),
    provider: providerSchema,
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    const now = Date.now();

    if (!existing) {
      const userId = await ctx.db.insert("users", {
        email,
        name: args.name.trim() || email,
        image: args.image,
        provider: args.provider,
        providerId: args.providerId,
        passwordHash: undefined,
        createdAt: now,
        updatedAt: now,
      });

      const created = await ctx.db.get(userId);

      if (!created) {
        throw new Error("CREATE_FAILED");
      }

      return toPublicUser(created);
    }

    await ctx.db.patch(existing._id, {
      name: args.name.trim() || existing.name,
      image: args.image ?? existing.image,
      provider: args.provider,
      providerId: args.providerId,
      updatedAt: now,
    });

    const updated = await ctx.db.get(existing._id);

    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    return toPublicUser(updated);
  },
});
