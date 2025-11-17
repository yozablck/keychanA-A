import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  keychains: defineTable({
    name: v.string(),
    creator: v.string(),
    stlStorageId: v.id("_storage"),
    imageStorageId: v.id("_storage"),
    createdAt: v.number(),
    likes: v.number(),
    // Options used to generate this keychain
    options: v.object({
      thickness: v.number(),
      textHeight: v.number(),
      text: v.optional(v.string()),
      fontStyle: v.optional(v.string()),
      hasHole: v.boolean(),
      holeX: v.optional(v.number()),
      holeY: v.optional(v.number()),
    }),
  })
    .index("by_creator", ["creator"])
    .index("by_created_at", ["createdAt"]),
});

