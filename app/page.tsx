"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useState, useEffect } from "react";

type Status = "done" | "in_progress" | "not_done" | "blocked";
type StatusFilter = Status | "all";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "not_done", label: "Not Done" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...STATUS_OPTIONS,
];

function statusBadge(status: Status) {
  const styles: Record<Status, string> = {
    not_done: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
    in_progress:
      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    done: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    blocked:
      "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };
  const labels: Record<Status, string> = {
    not_done: "Not Done",
    in_progress: "In Progress",
    done: "Done",
    blocked: "Blocked",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString();
}

export default function Home() {
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editingId, setEditingId] = useState<Id<"todos"> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const queryArgs: { status?: Status } = {};
  if (statusFilter !== "all") queryArgs.status = statusFilter;

  const todos = useQuery(api.todos.list, queryArgs);
  const createTodo = useMutation(api.todos.create);
  const updateTodo = useMutation(api.todos.update);
  const removeTodo = useMutation(api.todos.remove);

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="w-full max-w-2xl px-4 py-12">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          ToDoToDone
        </h1>

        {/* Add todo inline */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newTodoTitle.trim() || isCreating) return;
            setIsCreating(true);
            await createTodo({ title: newTodoTitle.trim() });
            setNewTodoTitle("");
            setIsCreating(false);
          }}
          className="mb-4 flex gap-2"
        >
          <input
            type="text"
            placeholder="Add a new todo..."
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            disabled={isCreating}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={isCreating || !newTodoTitle.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isCreating ? "Adding..." : "Add"}
          </button>
        </form>

        {/* Status filter tabs */}
        <div className="mb-6 flex gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Todo list */}
        <div className="mt-4 flex flex-col gap-3">
          {todos === undefined ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : todos.length === 0 ? (
            <p className="text-sm text-zinc-500">No todos found.</p>
          ) : (
            todos.map((todo) => (
              <TodoItem
                key={todo._id}
                todo={todo}
                isEditing={editingId === todo._id}
                onEdit={() => setEditingId(todo._id)}
                onCancelEdit={() => setEditingId(null)}
                onUpdate={async (fields) => {
                  await updateTodo({ id: todo._id, ...fields });
                  setEditingId(null);
                }}
                onDelete={async () => {
                  if (window.confirm(`Delete "${todo.title}"?`)) {
                    await removeTodo({ id: todo._id });
                  }
                }}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function TodoItem({
  todo,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: {
  todo: {
    _id: Id<"todos">;
    title: string;
    status: Status;
    content?: string;
    createdAt: number;
    updatedAt: number;
  };
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (fields: {
    title?: string;
    status?: Status;
    content?: string;
  }) => Promise<void>;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [status, setStatus] = useState<Status>(todo.status);
  const [content, setContent] = useState(todo.content ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Sync local state when todo prop changes (e.g. real-time update)
  useEffect(() => {
    if (!isEditing) {
      setTitle(todo.title);
      setStatus(todo.status);
      setContent(todo.content ?? "");
    }
  }, [todo.title, todo.status, todo.content, isEditing]);

  const handleSave = async () => {
    setSubmitting(true);
    const updates: { title?: string; status?: Status; content?: string } = {};
    if (title.trim() !== todo.title) updates.title = title.trim();
    if (status !== todo.status) updates.status = status;
    if (content !== (todo.content ?? "")) updates.content = content;
    await onUpdate(updates);
    setSubmitting(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={submitting || !title.trim()}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onCancelEdit}
            className="rounded-lg bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        {statusBadge(todo.status)}
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {todo.title}
        </span>
      </div>
      {todo.content && (
        <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
          {todo.content}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          Created {formatDate(todo.createdAt)} · Updated{" "}
          {formatDate(todo.updatedAt)}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs font-medium text-red-500 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
