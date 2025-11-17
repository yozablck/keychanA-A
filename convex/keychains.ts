import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new keychain record
export const create = mutation({
  args: {
    name: v.string(),
    creator: v.string(),
    stlStorageId: v.id("_storage"),
    imageStorageId: v.id("_storage"),
    options: v.object({
      thickness: v.number(),
      textHeight: v.number(),
      text: v.optional(v.string()),
      fontStyle: v.optional(v.string()),
      hasHole: v.boolean(),
      holeX: v.optional(v.number()),
      holeY: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const keychainId = await ctx.db.insert("keychains", {
      name: args.name,
      creator: args.creator,
      stlStorageId: args.stlStorageId,
      imageStorageId: args.imageStorageId,
      createdAt: Date.now(),
      likes: 0,
      options: args.options,
    });
    return keychainId;
  },
});

// List all keychains
export const list = query({
  args: {
    filter: v.optional(v.union(v.literal("today"), v.literal("week"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    let keychains = await ctx.db
      .query("keychains")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    // Apply time filter
    if (args.filter === "today") {
      keychains = keychains.filter((k) => now - k.createdAt < oneDay);
    } else if (args.filter === "week") {
      keychains = keychains.filter((k) => now - k.createdAt < oneWeek);
    }
    // "all" returns everything

    return keychains;
  },
});

// Get a single keychain by ID
export const get = query({
  args: { id: v.id("keychains") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Increment likes
export const like = mutation({
  args: { id: v.id("keychains") },
  handler: async (ctx, args) => {
    const keychain = await ctx.db.get(args.id);
    if (!keychain) {
      throw new Error("Keychain not found");
    }
    await ctx.db.patch(args.id, {
      likes: keychain.likes + 1,
    });
  },
});

