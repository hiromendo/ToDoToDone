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
    not_done: "bg-badge-1 text-text-primary",
    in_progress: "bg-badge-2 text-text-primary",
    done: "bg-badge-3 text-text-primary",
    blocked: "bg-badge-4 text-text-primary",
  };
  const labels: Record<Status, string> = {
    not_done: "Not Done",
    in_progress: "In Progress",
    done: "Done",
    blocked: "Blocked",
  };
  return (
    <span
      className={`theme-badge inline-block px-2 py-0.5 text-xs font-medium ${styles[status]}`}
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
    <div className="flex min-h-screen items-start justify-center bg-surface font-sans">
      <main className="w-full max-w-2xl px-4 py-12">
        <h1 className="theme-heading mb-8 text-3xl tracking-tight text-text-primary">
          Todo To Done
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
            className="theme-input flex-1 px-4 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isCreating || !newTodoTitle.trim()}
            className="theme-button-cta bg-text-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
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
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-text-primary text-white"
                  : "bg-badge-1 text-text-secondary hover:bg-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Todo list */}
        <div className="mt-4 flex flex-col gap-3">
          {todos === undefined ? (
            <p className="text-sm text-text-secondary">Loading...</p>
          ) : todos.length === 0 ? (
            <p className="text-sm text-text-secondary">No todos found.</p>
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
      <div className="theme-card flex flex-col gap-2 p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="theme-input px-3 py-2 text-sm text-text-primary outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className="theme-input px-3 py-2 text-sm text-text-primary outline-none"
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
          className="theme-input px-3 py-2 text-sm text-text-primary outline-none"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={submitting || !title.trim()}
            className="theme-button-cta bg-text-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onCancelEdit}
            className="rounded-full bg-badge-1 px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-border"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-card flex flex-col gap-2 p-4">
      <div className="flex items-center gap-3">
        {statusBadge(todo.status)}
        <span className="text-sm font-medium text-text-primary">
          {todo.title}
        </span>
      </div>
      {todo.content && (
        <p className="whitespace-pre-wrap text-sm text-text-secondary">
          {todo.content}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-tertiary">
          Created {formatDate(todo.createdAt)} · Updated{" "}
          {formatDate(todo.updatedAt)}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs font-medium text-red-400 transition-colors hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
