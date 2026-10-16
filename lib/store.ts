// A small JSON-file data store. All writes go through one queue and are
// written atomically (temp file + rename), so concurrent requests in the
// same server process cannot corrupt the file.

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Data, Priority, Role, Session, Status, Task, User } from "./types";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class StoreError extends Error {}

export class Store {
  private data: Data | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string | null) {}

  private async load(): Promise<Data> {
    if (this.data) return this.data;
    if (!this.file) return (this.data = { users: [], sessions: [], tasks: [] });
    try {
      this.data = JSON.parse(await readFile(this.file, "utf8")) as Data;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      this.data = { users: [], sessions: [], tasks: [] };
    }
    return this.data;
  }

  private async persist() {
    if (!this.file || !this.data) return;
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(this.data, null, 2));
    await rename(tmp, this.file);
  }

  // Runs fn against the data and saves the result; calls are serialised.
  private mutate<T>(fn: (data: Data) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const data = await this.load();
      const result = fn(data);
      await this.persist();
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async read<T>(fn: (data: Data) => T): Promise<T> {
    await this.queue;
    return fn(await this.load());
  }

  // ---- users -------------------------------------------------------------

  createUser(input: { name: string; email: string; passwordHash: string }): Promise<User> {
    return this.mutate((data) => {
      const email = input.email.trim().toLowerCase();
      if (data.users.some((u) => u.email === email)) throw new StoreError("An account with this email already exists.");
      const user: User = {
        id: randomUUID(),
        name: input.name.trim(),
        email,
        // The first account becomes the admin; everyone after joins as a member.
        role: data.users.length === 0 ? "admin" : "member",
        passwordHash: input.passwordHash,
        createdAt: new Date().toISOString(),
      };
      data.users.push(user);
      return user;
    });
  }

  findUserByEmail(email: string) {
    return this.read((d) => d.users.find((u) => u.email === email.trim().toLowerCase()) ?? null);
  }

  getUser(id: string) {
    return this.read((d) => d.users.find((u) => u.id === id) ?? null);
  }

  listUsers() {
    return this.read((d) => [...d.users].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  }

  setRole(userId: string, role: Role): Promise<User> {
    return this.mutate((data) => {
      const user = data.users.find((u) => u.id === userId);
      if (!user) throw new StoreError("User not found.");
      if (user.role === "admin" && role !== "admin" && data.users.filter((u) => u.role === "admin").length === 1) {
        throw new StoreError("There must be at least one admin.");
      }
      user.role = role;
      // A role change signs the user out everywhere so it takes effect at once.
      data.sessions = data.sessions.filter((s) => s.userId !== userId);
      return user;
    });
  }

  // ---- sessions ----------------------------------------------------------

  createSession(userId: string, tokenHash: string, now = Date.now()): Promise<Session> {
    return this.mutate((data) => {
      data.sessions = data.sessions.filter((s) => Date.parse(s.expiresAt) > now);
      const session = { tokenHash, userId, expiresAt: new Date(now + SESSION_TTL_MS).toISOString() };
      data.sessions.push(session);
      return session;
    });
  }

  findSession(tokenHash: string, now = Date.now()) {
    return this.read((d) => d.sessions.find((s) => s.tokenHash === tokenHash && Date.parse(s.expiresAt) > now) ?? null);
  }

  deleteSession(tokenHash: string) {
    return this.mutate((data) => {
      data.sessions = data.sessions.filter((s) => s.tokenHash !== tokenHash);
    });
  }

  // ---- tasks -------------------------------------------------------------

  listTasks() {
    return this.read((d) => [...d.tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  getTask(id: string) {
    return this.read((d) => d.tasks.find((t) => t.id === id) ?? null);
  }

  createTask(input: { title: string; description: string; priority: Priority; assigneeId: string | null; createdBy: string }): Promise<Task> {
    return this.mutate((data) => {
      if (input.assigneeId && !data.users.some((u) => u.id === input.assigneeId)) throw new StoreError("Assignee not found.");
      const now = new Date().toISOString();
      const task: Task = { id: randomUUID(), status: "todo", createdAt: now, updatedAt: now, ...input };
      data.tasks.push(task);
      return task;
    });
  }

  updateTask(id: string, patch: Partial<Pick<Task, "title" | "description" | "priority" | "assigneeId">> & { status?: Status }): Promise<Task> {
    return this.mutate((data) => {
      const task = data.tasks.find((t) => t.id === id);
      if (!task) throw new StoreError("Task not found.");
      if (patch.assigneeId && !data.users.some((u) => u.id === patch.assigneeId)) throw new StoreError("Assignee not found.");
      Object.assign(task, patch, { updatedAt: new Date().toISOString() });
      return task;
    });
  }

  deleteTask(id: string) {
    return this.mutate((data) => {
      const before = data.tasks.length;
      data.tasks = data.tasks.filter((t) => t.id !== id);
      if (data.tasks.length === before) throw new StoreError("Task not found.");
    });
  }
}

const globalStore = globalThis as unknown as { __store?: Store };

export function getStore(): Store {
  return (globalStore.__store ??= new Store(path.resolve(process.env.DATA_FILE ?? path.join("data", "db.json"))));
}
