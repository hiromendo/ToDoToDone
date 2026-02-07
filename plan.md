# ToDoToDone - Implementation Plan

## Context

Build a todo list app backed by Convex DB with two interfaces:
1. **Web UI** — real-time Next.js frontend for viewing/managing todos
2. **HTTP API** — curl-accessible endpoints at the Convex site URL for agents (OpenClaw, etc.)

Single user, multiple concurrent agents. All data stored in Convex.

---

## Implementation Order

### 1. `convex/schema.ts` — Database Schema (new file)

Define the `todos` table:

| Field       | Type                                           | Notes                    |
|-------------|------------------------------------------------|--------------------------|
| `title`     | `v.string()`                                   | Todo title               |
| `status`    | `v.union(v.literal("done"), v.literal("in_progress"), v.literal("not_done"))` | Enum-like status |
| `content`   | `v.optional(v.string())`                       | Agent progress notes     |
| `createdAt` | `v.number()`                                   | `Date.now()` timestamp   |
| `updatedAt` | `v.number()`                                   | `Date.now()` timestamp   |

Indexes:
- `.index("by_status", ["status"])` — for status-only filtering
- `.searchIndex("search_title", { searchField: "title", filterFields: ["status"] })` — for title search + optional status filter

---

### 2. `convex/todos.ts` — Query & Mutation Functions (new file)

Five functions:

- **`list`** (query) — args: `{ status?, search? }`. Uses search index when search is provided, `by_status` index for status-only, full table scan otherwise. Returns newest first.
- **`get`** (query) — args: `{ id }`. Returns single todo by ID.
- **`create`** (mutation) — args: `{ title, status, content? }`. Sets `createdAt`/`updatedAt` to `Date.now()`.
- **`update`** (mutation) — args: `{ id, title?, status?, content? }`. Partial update via `db.patch()`. Updates `updatedAt`. Throws if not found.
- **`remove`** (mutation) — args: `{ id }`. Deletes todo. Throws if not found.

Concurrency: Convex OCC handles concurrent agent writes automatically. `patch` minimizes field-level conflicts.

---

### 3. `convex/http.ts` — HTTP API for Agents (new file)

REST endpoints at `CONVEX_SITE_URL` (`https://exuberant-lynx-547.convex.site`):

| Method   | Path           | Description                                      |
|----------|----------------|--------------------------------------------------|
| `POST`   | `/todos`       | Create a todo. Body: `{ title, status?, content? }` |
| `GET`    | `/todos`       | List todos. Query params: `?status=...&search=...` |
| `GET`    | `/todos/<id>`  | Get single todo by ID                            |
| `PATCH`  | `/todos/<id>`  | Update todo. Body: `{ title?, status?, content? }` |
| `DELETE` | `/todos/<id>`  | Delete todo                                      |
| `OPTIONS`| `/todos[/...]` | CORS preflight                                   |

- Uses `pathPrefix: "/todos/"` for ID-based routes with manual path parsing
- All responses include CORS headers
- Calls `ctx.runQuery`/`ctx.runMutation` internally to reuse `convex/todos.ts` logic
- Returns JSON with appropriate status codes (201 on create, 404 on not found, 400 on bad request)

**Example curl usage:**
```bash
# Create
curl -X POST https://exuberant-lynx-547.convex.site/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix login bug", "status": "in_progress", "content": "Investigating auth flow"}'

# List (with filters)
curl "https://exuberant-lynx-547.convex.site/todos?status=in_progress&search=login"

# Update
curl -X PATCH https://exuberant-lynx-547.convex.site/todos/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "done", "content": "Fixed in commit abc123"}'

# Delete
curl -X DELETE https://exuberant-lynx-547.convex.site/todos/<id>
```

---

### 4. `app/page.tsx` — Todo List UI (replace existing)

Single `"use client"` page with:

- **Search bar** — debounced text input (300ms), passes to `useQuery(api.todos.list, { search })`
- **Status filter tabs** — "All", "Not Done", "In Progress", "Done" buttons
- **Add todo form** — toggle-able form with title, status dropdown, content textarea
- **Todo list** — real-time via `useQuery`, shows status badge + title + content preview + timestamps
- **Inline editing** — clicking "Edit" transforms the row into input fields
- **Delete** — with `window.confirm()` confirmation

Real-time: Convex subscriptions auto-update the UI when agents modify todos via the HTTP API.

Styling: Tailwind utility classes, zinc palette, Geist font, dark mode support (already configured in globals.css).

---

### 5. `app/layout.tsx` — Minor Update (edit existing)

Update metadata title from "Create Next App" to "ToDoToDone".

---

### 6. `agent-skills/todotodone.md` — Agent Skills File (new file)

A markdown file that agents (OpenClaw, Claude Code, etc.) can read to understand how to interact with the ToDoToDone API. Contains:

- **Base URL** — the Convex site URL for the HTTP API
- **Available endpoints** — each endpoint with method, path, request body/params, and response format
- **Status values** — the valid enum values (`done`, `in_progress`, `not_done`)
- **Example curl commands** — copy-pasteable examples for every operation (create, list with filters, get, update, delete)
- **Usage guidelines** — best practices for agents (e.g., set status to `in_progress` when starting work, update `content` with progress notes, set to `done` when finished)

---

## Verification

1. Run `npx convex dev` — deploys schema, functions, and HTTP routes
2. Run `npm run dev` — starts Next.js frontend
3. Test HTTP API via curl (create, list, get, update, delete)
4. Test frontend: add/edit/delete todos, verify real-time updates
5. Test concurrent access: create a todo via curl, verify it appears in the browser immediately

## Files Modified/Created

- `convex/schema.ts` — **new**
- `convex/todos.ts` — **new**
- `convex/http.ts` — **new**
- `app/page.tsx` — **replace**
- `app/layout.tsx` — **edit** (metadata only)
- `agent-skills/todotodone.md` — **new** (agent reference for curl API usage)
