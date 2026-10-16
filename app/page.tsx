import AppHeader from "@/components/app-header";
import Board from "@/components/board";
import { requireUser } from "@/lib/session";
import { getStore } from "@/lib/store";
import { toPublicUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireUser();
  const store = getStore();
  const [tasks, users] = await Promise.all([store.listTasks(), store.listUsers()]);

  return (
    <>
      <AppHeader user={me} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Team board</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"} · changes appear instantly for everyone on the board
            {me.role === "viewer" && " · you have read-only access"}
          </p>
        </div>
        <Board tasks={tasks} users={users.map(toPublicUser)} me={me} />
      </main>
    </>
  );
}
