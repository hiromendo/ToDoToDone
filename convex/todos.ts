import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const statusValidator = v.union(
  v.literal("done"),
  v.literal("in_progress"),
  v.literal("not_done"),
  v.literal("blocked"),
);

export const list = query({
  args: {
    status: v.optional(statusValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.search) {
      let q = ctx.db
        .query("todos")
        .withSearchIndex("search_title", (q) => {
          const base = q.search("title", args.search!);
          return args.status ? base.eq("status", args.status) : base;
        });
      return await q.collect();
    }

    if (args.status) {
      return await ctx.db
        .query("todos")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }

    return await ctx.db.query("todos").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    status: v.optional(statusValidator),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("todos", {
      title: args.title,
      status: args.status ?? "not_done",
      content: args.content,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("todos"),
    title: v.optional(v.string()),
    status: v.optional(statusValidator),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Todo not found");
    }

    const { id, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.status !== undefined) updates.status = fields.status;
    if (fields.content !== undefined) updates.content = fields.content;

    await ctx.db.patch(id, updates);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Todo not found");
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});
