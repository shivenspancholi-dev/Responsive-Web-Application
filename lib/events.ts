// In-process pub/sub used to push changes to every open browser over
// Server-Sent Events. Kept on globalThis so dev-mode reloads share one bus.

import { EventEmitter } from "node:events";

export interface ChangeEvent {
  kind: "task" | "user";
  action: "created" | "updated" | "deleted";
  id: string;
  by: string;
  at: string;
}

const globalBus = globalThis as unknown as { __changeBus?: EventEmitter };
export const bus = globalBus.__changeBus ?? (globalBus.__changeBus = new EventEmitter().setMaxListeners(0));

export function publish(event: Omit<ChangeEvent, "at">) {
  bus.emit("change", { ...event, at: new Date().toISOString() } satisfies ChangeEvent);
}

export function subscribe(listener: (event: ChangeEvent) => void): () => void {
  bus.on("change", listener);
  return () => bus.off("change", listener);
}
