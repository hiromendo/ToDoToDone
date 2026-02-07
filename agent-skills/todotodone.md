# ToDoToDone API — Agent Skills

## Access & Credentials

### Option 1: HTTP API (no credentials required)

The custom HTTP endpoints are **publicly accessible** — no API key or auth token needed. Just call the base URL directly:

```
https://exuberant-lynx-547.convex.site
```

This is the recommended method for agents. All examples in this document use this approach.

### Option 2: Convex Cloud API (requires deploy key)

For direct Convex function calls (bypassing the HTTP routes), use the Convex Cloud URL with a deploy key:

```
https://exuberant-lynx-547.convex.cloud
```

**How to obtain a deploy key:**

1. Open the Convex dashboard: https://dashboard.convex.dev/d/exuberant-lynx-547
2. Navigate to **Settings** > **Deploy keys**
3. Click **Generate deploy key**
4. Copy the key (format: `prod:exuberant-lynx-547|...` or `dev:exuberant-lynx-547|...`)

**Using the deploy key to call functions directly:**

```bash
# Call a query function
curl -X POST https://exuberant-lynx-547.convex.cloud/api/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Convex <DEPLOY_KEY>" \
  -d '{"path": "todos:list", "args": {"status": "in_progress"}}'

# Call a mutation function
curl -X POST https://exuberant-lynx-547.convex.cloud/api/mutation \
  -H "Content-Type: application/json" \
  -H "Authorization: Convex <DEPLOY_KEY>" \
  -d '{"path": "todos:create", "args": {"title": "New task", "status": "not_done"}}'
```

**Where credentials are stored locally:**

| Variable | File | Purpose |
|---|---|---|
| `CONVEX_DEPLOYMENT` | `.env.local` | Deployment name (`dev:exuberant-lynx-547`) — used by `npx convex` CLI |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` | Cloud URL for the React client (`https://exuberant-lynx-547.convex.cloud`) |

Deploy keys are **not** stored in the repo — generate them from the dashboard when needed. The `CONVEX_DEPLOYMENT` value in `.env.local` identifies the deployment but is not a secret and cannot be used for authentication on its own.

### Summary

| Method | URL | Auth needed | Best for |
|---|---|---|---|
| HTTP API | `https://exuberant-lynx-547.convex.site/todos` | None | Agents (simple curl calls) |
| Cloud API | `https://exuberant-lynx-547.convex.cloud/api/...` | Deploy key | Programmatic access, admin operations |

---

## Status Values

- `not_done` — Not started
- `in_progress` — Currently being worked on
- `done` — Completed
- `blocked` — Cannot be completed, needs input or is stuck

## Endpoints

### Create a Todo

```bash
curl -X POST https://exuberant-lynx-547.convex.site/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix login bug", "status": "in_progress", "content": "Investigating auth flow"}'
```

**Request body:**
- `title` (string, required) — The todo title
- `status` (string, optional) — One of `not_done`, `in_progress`, `done`. Defaults to `not_done`
- `content` (string, optional) — Progress notes or details

**Response:** `201 Created` with the full todo object.

### List Todos

```bash
# All todos
curl https://exuberant-lynx-547.convex.site/todos

# Filter by status
curl "https://exuberant-lynx-547.convex.site/todos?status=in_progress"

# Search by title
curl "https://exuberant-lynx-547.convex.site/todos?search=login"

# Search + filter
curl "https://exuberant-lynx-547.convex.site/todos?status=in_progress&search=login"
```

**Query parameters:**
- `status` (optional) — Filter by status
- `search` (optional) — Full-text search on title

**Response:** `200 OK` with an array of todo objects.

### Get a Todo

```bash
curl https://exuberant-lynx-547.convex.site/todos/<id>
```

**Response:** `200 OK` with the todo object, or `404` if not found.

### Update a Todo

```bash
curl -X PATCH https://exuberant-lynx-547.convex.site/todos/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "done", "content": "Fixed in commit abc123"}'
```

**Request body (all fields optional):**
- `title` (string) — New title
- `status` (string) — New status
- `content` (string) — Updated notes

**Response:** `200 OK` with the updated todo object, or `404` if not found.

### Delete a Todo

```bash
curl -X DELETE https://exuberant-lynx-547.convex.site/todos/<id>
```

**Response:** `200 OK` with `{"deleted": true}`, or `404` if not found.

## Todo Object Shape

```json
{
  "_id": "j57...",
  "_creationTime": 1234567890,
  "title": "Fix login bug",
  "status": "in_progress",
  "content": "Investigating auth flow",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

## Usage Guidelines

1. **Starting work** — Create a todo with `status: "in_progress"` or update an existing one
2. **Progress notes** — Use the `content` field to log progress, findings, or context
3. **Completing work** — Set `status: "done"` and update `content` with a summary
4. **Check existing todos** — List with `status=not_done` or `status=in_progress` before creating duplicates
5. **Search first** — Use the `search` parameter to find relevant existing todos before creating new ones
