"use client";

import { useState, useTransition } from "react";
import { changeRole } from "@/app/actions";
import { ROLES, type Role } from "@/lib/types";

export default function RoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="sm:w-40">
      <select
        aria-label="Role"
        defaultValue={role}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Role;
          const select = e.target;
          setError("");
          startTransition(async () => {
            const result = await changeRole(userId, next);
            if (result.error) {
              setError(result.error);
              select.value = role;
            }
          });
        }}
        className="input capitalize"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
