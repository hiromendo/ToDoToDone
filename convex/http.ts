import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function errorResponse(message: string, status: number) {
  return json({ error: message }, status);
}

const validStatuses = ["done", "in_progress", "not_done", "blocked"] as const;
type Status = (typeof validStatuses)[number];

function isValidStatus(s: string): s is Status {
  return (validStatuses as readonly string[]).includes(s);
}

// POST /todos — Create a todo
// GET /todos — List todos (with optional ?status=...&search=...)
http.route({
  path: "/todos",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const title = body.title;
    if (typeof title !== "string" || title.trim() === "") {
      return errorResponse("title is required and must be a non-empty string", 400);
    }

    const status = body.status as string | undefined;
    if (status !== undefined && !isValidStatus(status)) {
      return errorResponse(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400);
    }

    const content = body.content as string | undefined;
    if (content !== undefined && typeof content !== "string") {
      return errorResponse("content must be a string", 400);
    }

    const id = await ctx.runMutation(api.todos.create, {
      title: title.trim(),
      status: status as Status | undefined,
      content,
    });

    const todo = await ctx.runQuery(api.todos.get, { id });
    return json(todo, 201);
  }),
});

http.route({
  path: "/todos",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;

    if (status !== undefined && !isValidStatus(status)) {
      return errorResponse(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400);
    }

    const todos = await ctx.runQuery(api.todos.list, {
      status: status as Status | undefined,
      search,
    });
    return json(todos);
  }),
});

http.route({
  path: "/todos",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

// GET/PATCH/DELETE /todos/<id>
http.route({
  pathPrefix: "/todos/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const id = extractId(request.url);
    if (!id) return errorResponse("Invalid todo ID", 400);

    const todo = await ctx.runQuery(api.todos.get, { id });
    if (!todo) return errorResponse("Todo not found", 404);
    return json(todo);
  }),
});

http.route({
  pathPrefix: "/todos/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const id = extractId(request.url);
    if (!id) return errorResponse("Invalid todo ID", 400);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const updates: { title?: string; status?: Status; content?: string } = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim() === "") {
        return errorResponse("title must be a non-empty string", 400);
      }
      updates.title = body.title.trim();
    }

    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !isValidStatus(body.status)) {
        return errorResponse(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400);
      }
      updates.status = body.status as Status;
    }

    if (body.content !== undefined) {
      if (typeof body.content !== "string") {
        return errorResponse("content must be a string", 400);
      }
      updates.content = body.content;
    }

    try {
      await ctx.runMutation(api.todos.update, { id, ...updates });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      if (message.includes("not found")) return errorResponse("Todo not found", 404);
      return errorResponse(message, 500);
    }

    const todo = await ctx.runQuery(api.todos.get, { id });
    return json(todo);
  }),
});

http.route({
  pathPrefix: "/todos/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const id = extractId(request.url);
    if (!id) return errorResponse("Invalid todo ID", 400);

    try {
      await ctx.runMutation(api.todos.remove, { id });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      if (message.includes("not found")) return errorResponse("Todo not found", 404);
      return errorResponse(message, 500);
    }

    return json({ deleted: true });
  }),
});

http.route({
  pathPrefix: "/todos/",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

function extractId(url: string): Id<"todos"> | null {
  try {
    const pathname = new URL(url).pathname;
    // pathname is /todos/<id>
    const id = pathname.replace(/^\/todos\//, "");
    if (!id) return null;
    return id as Id<"todos">;
  } catch {
    return null;
  }
}

export default http;
