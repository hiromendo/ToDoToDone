import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  todos: defineTable({
    title: v.string(),
    status: v.union(
      v.literal("done"),
      v.literal("in_progress"),
      v.literal("not_done"),
      v.literal("blocked"),
    ),
    content: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["status"],
    }),
});
