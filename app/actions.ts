"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { publish } from "@/lib/events";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/password";
import { canChangeStatus, canCreateTask, canDeleteTask, canEditTask, canManageUsers } from "@/lib/permissions";
import { endSession, getCurrentUser, startSession } from "@/lib/session";
import { getStore, StoreError } from "@/lib/store";
import { PRIORITIES, ROLES, STATUSES, type Priority, type PublicUser, type Role, type Status } from "@/lib/types";

export interface ActionState {
  error?: string;
  ok?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (form: FormData, key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);

async function actor(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Your session has ended. Please sign in again.");
  return user;
}

function failure(err: unknown): ActionState {
  if (err instanceof StoreError) return { error: err.message };
  if (err instanceof Error && err.message.startsWith("Your session")) return { error: err.message };
  console.error(err);
  return { error: "Something went wrong. Please try again." };
}

// ---- auth -----------------------------------------------------------------

// Basic brute-force protection: 5 failed logins per email per 15 minutes.
const failedLogins = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;

export async function signup(_prev: ActionState, form: FormData): Promise<ActionState> {
  const name = text(form, "name", 80);
  const email = text(form, "email", 200).toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name) return { error: "Please enter your name." };
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };
  const weak = validatePassword(password);
  if (weak) return { error: weak };

  try {
    const user = await getStore().createUser({ name, email, passwordHash: await hashPassword(password) });
    await startSession(user.id);
    publish({ kind: "user", action: "created", id: user.id, by: user.id });
  } catch (err) {
    return failure(err);
  }
  redirect("/");
}

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = text(form, "email", 200).toLowerCase();
  const password = String(form.get("password") ?? "");
  const now = Date.now();
  const recent = (failedLogins.get(email) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= 5) return { error: "Too many attempts. Please wait 15 minutes and try again." };

  const user = await getStore().findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    failedLogins.set(email, [...recent, now]);
    return { error: "Email or password is incorrect." };
  }
  failedLogins.delete(email);
  await startSession(user.id);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

// ---- tasks ----------------------------------------------------------------

function parsePriority(value: FormDataEntryValue | null): Priority {
  return PRIORITIES.includes(value as Priority) ? (value as Priority) : "medium";
}

export async function createTask(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await actor();
    if (!canCreateTask(user)) return { error: "Viewers cannot create tasks." };
    const title = text(form, "title", 120);
    if (!title) return { error: "Please give the task a title." };
    const task = await getStore().createTask({
      title,
      description: text(form, "description", 2000),
      priority: parsePriority(form.get("priority")),
      assigneeId: text(form, "assigneeId", 64) || null,
      createdBy: user.id,
    });
    publish({ kind: "task", action: "created", id: task.id, by: user.id });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function updateTask(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await actor();
    const id = text(form, "id", 64);
    const task = await getStore().getTask(id);
    if (!task) return { error: "Task not found." };
    if (!canEditTask(user, task)) return { error: "You can only edit tasks you created or are assigned to." };
    const title = text(form, "title", 120);
    if (!title) return { error: "Please give the task a title." };
    await getStore().updateTask(id, {
      title,
      description: text(form, "description", 2000),
      priority: parsePriority(form.get("priority")),
      assigneeId: text(form, "assigneeId", 64) || null,
    });
    publish({ kind: "task", action: "updated", id, by: user.id });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function moveTask(id: string, status: Status): Promise<ActionState> {
  try {
    const user = await actor();
    if (!STATUSES.includes(status)) return { error: "Unknown status." };
    const task = await getStore().getTask(String(id));
    if (!task) return { error: "Task not found." };
    if (!canChangeStatus(user, task)) return { error: "Viewers cannot move tasks." };
    await getStore().updateTask(task.id, { status });
    publish({ kind: "task", action: "updated", id: task.id, by: user.id });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function deleteTask(id: string): Promise<ActionState> {
  try {
    const user = await actor();
    const task = await getStore().getTask(String(id));
    if (!task) return { error: "Task not found." };
    if (!canDeleteTask(user, task)) return { error: "You can only delete tasks you created." };
    await getStore().deleteTask(task.id);
    publish({ kind: "task", action: "deleted", id: task.id, by: user.id });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

// ---- users ----------------------------------------------------------------

export async function changeRole(userId: string, role: Role): Promise<ActionState> {
  try {
    const user = await actor();
    if (!canManageUsers(user)) return { error: "Only admins can change roles." };
    if (!ROLES.includes(role)) return { error: "Unknown role." };
    await getStore().setRole(String(userId), role);
    publish({ kind: "user", action: "updated", id: String(userId), by: user.id });
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}
