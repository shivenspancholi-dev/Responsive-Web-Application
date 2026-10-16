import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppHeader from "@/components/app-header";
import RoleSelect from "@/components/role-select";
import { canManageUsers } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Team" };

const ROLE_HELP = [
  ["Admin", "Everything, including managing roles."],
  ["Member", "Create tasks, move any task, edit tasks they own or are assigned to."],
  ["Viewer", "Read-only access to the board."],
];

export default async function AdminPage() {
  const me = await requireUser();
  if (!canManageUsers(me)) redirect("/");
  const users = await getStore().listUsers();

  return (
    <>
      <AppHeader user={me} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-neutral-500">Changing a role signs that person out so the new permissions apply at once.</p>

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          {ROLE_HELP.map(([role, help]) => (
            <div key={role} className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
              <dt className="font-medium">{role}</dt>
              <dd className="text-neutral-500">{help}</dd>
            </div>
          ))}
        </dl>

        <ul className="mt-6 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {users.map((u) => (
            <li key={u.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {u.name} {u.id === me.id && <span className="text-xs text-neutral-500">(you)</span>}
                </p>
                <p className="truncate text-sm text-neutral-500">{u.email}</p>
              </div>
              <p className="text-xs text-neutral-500 sm:w-32">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
              <RoleSelect userId={u.id} role={u.role} />
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
