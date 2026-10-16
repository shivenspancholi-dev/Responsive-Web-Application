// Single source of truth for who may do what. Server Actions call these
// before every write; the UI calls the same functions to hide controls.

import type { PublicUser, Task } from "./types";

type Actor = Pick<PublicUser, "id" | "role">;

export function canCreateTask(user: Actor): boolean {
  return user.role === "admin" || user.role === "member";
}

// Members can move any task on the board (it is a shared board) ...
export function canChangeStatus(user: Actor, _task?: Task): boolean {
  return user.role === "admin" || user.role === "member";
}

// ... but only edit or delete the tasks they created or are assigned to.
export function canEditTask(user: Actor, task: Task): boolean {
  if (user.role === "admin") return true;
  if (user.role !== "member") return false;
  return task.createdBy === user.id || task.assigneeId === user.id;
}

export function canDeleteTask(user: Actor, task: Task): boolean {
  if (user.role === "admin") return true;
  return user.role === "member" && task.createdBy === user.id;
}

export function canManageUsers(user: Actor): boolean {
  return user.role === "admin";
}
