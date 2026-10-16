"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/actions";
import type { PublicUser } from "@/lib/types";
import LiveIndicator from "./live-updates";

export default function AppHeader({ user }: { user: PublicUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links = [{ href: "/", label: "Board" }, ...(user.role === "admin" ? [{ href: "/admin", label: "Team" }] : [])];

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Team<span className="text-violet-600">Board</span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 aria-[current=page]:font-medium aria-[current=page]:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:aria-[current=page]:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LiveIndicator />
          <div className="hidden text-right text-xs leading-tight sm:block">
            <div className="font-medium">{user.name}</div>
            <div className="capitalize text-neutral-500">{user.role}</div>
          </div>
          <form action={logout} className="hidden sm:block">
            <button className="btn-ghost">Sign out</button>
          </form>
          <button
            className="btn-ghost sm:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-neutral-200 px-4 py-3 sm:hidden dark:border-neutral-800">
          <p className="mb-2 text-sm">
            {user.name} <span className="capitalize text-neutral-500">· {user.role}</span>
          </p>
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                {l.label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="mt-2">
            <button className="btn-ghost w-full justify-start px-2">Sign out</button>
          </form>
        </div>
      )}
    </header>
  );
}
