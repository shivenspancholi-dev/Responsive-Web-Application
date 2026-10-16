"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTask, updateTask, type ActionState } from "@/app/actions";
import { PRIORITIES, type PublicUser, type Task } from "@/lib/types";

interface Props {
  users: PublicUser[];
  task?: Task;
  onDone?: () => void;
}

export default function TaskForm({ users, task, onDone }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(task ? updateTask : createTask, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      if (!task) form.current?.reset();
      onDone?.();
    }
  }, [state, task, onDone]);

  return (
    <form ref={form} action={action} className="grid gap-3">
      {task && <input type="hidden" name="id" value={task.id} />}
      <div>
        <label htmlFor={`title-${task?.id ?? "new"}`} className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Title
        </label>
        <input id={`title-${task?.id ?? "new"}`} name="title" required maxLength={120} defaultValue={task?.title} className="input" placeholder="What needs doing?" />
      </div>
      <div>
        <label htmlFor={`desc-${task?.id ?? "new"}`} className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Description
        </label>
        <textarea id={`desc-${task?.id ?? "new"}`} name="description" rows={3} maxLength={2000} defaultValue={task?.description} className="input" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`prio-${task?.id ?? "new"}`} className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Priority
          </label>
          <select id={`prio-${task?.id ?? "new"}`} name="priority" defaultValue={task?.priority ?? "medium"} className="input capitalize">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`assignee-${task?.id ?? "new"}`} className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Assignee
          </label>
          <select id={`assignee-${task?.id ?? "new"}`} name="assigneeId" defaultValue={task?.assigneeId ?? ""} className="input">
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onDone && (
          <button type="button" className="btn-ghost" onClick={onDone}>
            Cancel
          </button>
        )}
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : task ? "Save changes" : "Add task"}
        </button>
      </div>
    </form>
  );
}
