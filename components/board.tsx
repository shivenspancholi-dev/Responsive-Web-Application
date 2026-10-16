"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { deleteTask, moveTask } from "@/app/actions";
import { canChangeStatus, canCreateTask, canDeleteTask, canEditTask } from "@/lib/permissions";
import { STATUS_LABELS, STATUSES, type PublicUser, type Status, type Task } from "@/lib/types";
import TaskForm from "./task-form";

interface Props {
  tasks: Task[];
  users: PublicUser[];
  me: PublicUser;
}

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
} as const;

export default function Board({ tasks, users, me }: Props) {
  const [optimisticTasks, applyMove] = useOptimistic(tasks, (state, move: { id: string; status: Status }) =>
    state.map((t) => (t.id === move.id ? { ...t, status: move.status } : t)),
  );
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [mobileColumn, setMobileColumn] = useState<Status>("todo");
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");

  const userName = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);

  const visible = optimisticTasks.filter((t) => {
    if (mineOnly && t.assigneeId !== me.id) return false;
    const q = query.trim().toLowerCase();
    return !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  });

  function move(task: Task, status: Status) {
    setError("");
    startTransition(async () => {
      applyMove({ id: task.id, status });
      const result = await moveTask(task.id, status);
      if (result.error) setError(result.error);
    });
  }

  function remove(task: Task) {
    if (!confirm(`Delete "${task.title}"?`)) return;
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          className="input sm:max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} className="h-4 w-4 accent-violet-600" />
          Assigned to me
        </label>
        {canCreateTask(me) && (
          <button className="btn-primary sm:ml-auto" onClick={() => setShowNew((s) => !s)} aria-expanded={showNew}>
            {showNew ? "Close" : "+ New task"}
          </button>
        )}
      </div>

      {showNew && (
        <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-semibold">New task</h2>
          <TaskForm users={users} onDone={() => setShowNew(false)} />
        </section>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}

      {/* On phones one column is shown at a time; tablets and up show all three. */}
      <div role="tablist" aria-label="Columns" className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-neutral-200/70 p-1 md:hidden dark:bg-neutral-800">
        {STATUSES.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={mobileColumn === s}
            onClick={() => setMobileColumn(s)}
            className="rounded-md px-2 py-1.5 text-xs font-medium text-neutral-600 aria-selected:bg-white aria-selected:text-neutral-900 aria-selected:shadow-sm dark:text-neutral-300 dark:aria-selected:bg-neutral-950 dark:aria-selected:text-white"
          >
            {STATUS_LABELS[s]} ({visible.filter((t) => t.status === s).length})
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((status) => {
          const column = visible.filter((t) => t.status === status);
          return (
            <section key={status} className={`${mobileColumn === status ? "block" : "hidden"} md:block`} aria-label={STATUS_LABELS[status]}>
              <h2 className="mb-2 hidden items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 md:flex">
                {STATUS_LABELS[status]}
                <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] dark:bg-neutral-800">{column.length}</span>
              </h2>
              <div className="space-y-3">
                {column.length === 0 && (
                  <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">No tasks</p>
                )}
                {column.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    users={users}
                    assignee={task.assigneeId ? userName.get(task.assigneeId) : undefined}
                    canMove={canChangeStatus(me, task)}
                    canEdit={canEditTask(me, task)}
                    canDelete={canDeleteTask(me, task)}
                    onMove={(s) => move(task, s)}
                    onDelete={() => remove(task)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface CardProps {
  task: Task;
  users: PublicUser[];
  assignee?: string;
  canMove: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onMove: (status: Status) => void;
  onDelete: () => void;
}

function TaskCard({ task, users, assignee, canMove, canEdit, canDelete, onMove, onDelete }: CardProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <article className="rounded-xl border border-violet-300 bg-white p-4 shadow-sm dark:border-violet-800 dark:bg-neutral-900">
        <TaskForm users={users} task={task} onDone={() => setEditing(false)} />
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium leading-snug">{task.title}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
      </div>
      {task.description && <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm text-neutral-600 dark:text-neutral-400">{task.description}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span>{assignee ? `👤 ${assignee}` : "Unassigned"}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={task.updatedAt}>{new Date(task.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</time>
      </div>
      {(canMove || canEdit || canDelete) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          {canMove && (
            <select
              aria-label={`Status of ${task.title}`}
              value={task.status}
              onChange={(e) => onMove(e.target.value as Status)}
              className="input w-auto py-1 text-xs"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          )}
          <div className="ml-auto flex gap-1">
            {canEdit && (
              <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
            {canDelete && (
              <button className="btn-ghost px-2 py-1 text-xs text-red-600 dark:text-red-400" onClick={onDelete}>
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
