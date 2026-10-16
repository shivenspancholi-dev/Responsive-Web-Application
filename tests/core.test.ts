import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { bus, publish, subscribe, type ChangeEvent } from "../lib/events";
import { hashPassword, hashToken, newSessionToken, validatePassword, verifyPassword } from "../lib/password";
import { canChangeStatus, canCreateTask, canDeleteTask, canEditTask, canManageUsers } from "../lib/permissions";
import { Store, StoreError } from "../lib/store";
import type { Task } from "../lib/types";

const task = (over: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Write docs",
  description: "",
  status: "todo",
  priority: "medium",
  assigneeId: null,
  createdBy: "author",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...over,
});

test("passwords are salted, verified, and checked for strength", async () => {
  const a = await hashPassword("correct horse 1");
  const b = await hashPassword("correct horse 1");
  assert.notEqual(a, b, "same password, different salt");
  assert.ok(await verifyPassword("correct horse 1", a));
  assert.ok(!(await verifyPassword("wrong horse 1", a)));
  assert.ok(!(await verifyPassword("anything", "garbage")));
  assert.match(validatePassword("short1") ?? "", /8 characters/);
  assert.match(validatePassword("lettersonly") ?? "", /number/);
  assert.equal(validatePassword("letters4ever"), null);
});

test("session tokens are random and only their hash is stored", () => {
  const token = newSessionToken();
  assert.notEqual(token, newSessionToken());
  assert.notEqual(hashToken(token), token);
  assert.equal(hashToken(token), hashToken(token));
});

test("role permissions", () => {
  const admin = { id: "a", role: "admin" as const };
  const member = { id: "m", role: "member" as const };
  const viewer = { id: "v", role: "viewer" as const };
  const own = task({ createdBy: "m" });
  const assigned = task({ assigneeId: "m" });
  const other = task();

  assert.ok(canCreateTask(member) && !canCreateTask(viewer));
  assert.ok(canChangeStatus(member, other) && !canChangeStatus(viewer, other));
  assert.ok(canEditTask(member, own) && canEditTask(member, assigned) && !canEditTask(member, other));
  assert.ok(canEditTask(admin, other) && !canEditTask(viewer, own));
  assert.ok(canDeleteTask(member, own) && !canDeleteTask(member, assigned) && canDeleteTask(admin, other));
  assert.ok(canManageUsers(admin) && !canManageUsers(member));
});

test("first user is admin, later users are members, emails are unique", async () => {
  const store = new Store(null);
  const first = await store.createUser({ name: "Ana", email: "Ana@Example.com", passwordHash: "x" });
  const second = await store.createUser({ name: "Ben", email: "ben@example.com", passwordHash: "x" });
  assert.equal(first.role, "admin");
  assert.equal(first.email, "ana@example.com");
  assert.equal(second.role, "member");
  await assert.rejects(store.createUser({ name: "Dup", email: "ANA@example.com", passwordHash: "x" }), StoreError);
});

test("the last admin cannot be demoted, and role changes end sessions", async () => {
  const store = new Store(null);
  const admin = await store.createUser({ name: "Ana", email: "ana@example.com", passwordHash: "x" });
  const member = await store.createUser({ name: "Ben", email: "ben@example.com", passwordHash: "x" });
  await assert.rejects(store.setRole(admin.id, "member"), /at least one admin/);

  await store.createSession(member.id, "tok");
  assert.ok(await store.findSession("tok"));
  await store.setRole(member.id, "viewer");
  assert.equal(await store.findSession("tok"), null);
});

test("sessions expire", async () => {
  const store = new Store(null);
  const user = await store.createUser({ name: "Ana", email: "ana@example.com", passwordHash: "x" });
  const start = Date.parse("2026-01-01T00:00:00Z");
  await store.createSession(user.id, "tok", start);
  assert.ok(await store.findSession("tok", start + 6 * 86_400_000));
  assert.equal(await store.findSession("tok", start + 8 * 86_400_000), null);
});

test("tasks: create, update, delete, reject unknown assignees", async () => {
  const store = new Store(null);
  const user = await store.createUser({ name: "Ana", email: "ana@example.com", passwordHash: "x" });
  const created = await store.createTask({ title: "Ship", description: "", priority: "high", assigneeId: user.id, createdBy: user.id });
  assert.equal(created.status, "todo");
  const moved = await store.updateTask(created.id, { status: "done" });
  assert.equal(moved.status, "done");
  await assert.rejects(store.updateTask(created.id, { assigneeId: "ghost" }), /Assignee not found/);
  await store.deleteTask(created.id);
  assert.equal((await store.listTasks()).length, 0);
  await assert.rejects(store.deleteTask(created.id), StoreError);
});

test("concurrent writes are serialised and persisted to disk", async () => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "store-")), "db.json");
  const store = new Store(file);
  const user = await store.createUser({ name: "Ana", email: "ana@example.com", passwordHash: "x" });
  await Promise.all(
    Array.from({ length: 25 }, (_, i) => store.createTask({ title: `T${i}`, description: "", priority: "low", assigneeId: null, createdBy: user.id })),
  );
  const onDisk = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(onDisk.tasks.length, 25);
  assert.equal((await new Store(file).listTasks()).length, 25, "a fresh store reads the same data");
});

test("change events reach every subscriber until they unsubscribe", () => {
  const seen: ChangeEvent[] = [];
  const stop = subscribe((e) => seen.push(e));
  publish({ kind: "task", action: "created", id: "t1", by: "u1" });
  stop();
  publish({ kind: "task", action: "deleted", id: "t1", by: "u1" });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].action, "created");
  assert.equal(bus.listenerCount("change"), 0);
});
