"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type ActionState } from "@/app/actions";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(mode === "login" ? login : signup, {});
  const isSignup = mode === "signup";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-lg font-semibold tracking-tight">
          Team<span className="text-violet-600">Board</span>
        </p>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-xl font-bold">{isSignup ? "Create your account" : "Sign in"}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {isSignup ? "The first account becomes the team admin." : "Welcome back."}
          </p>
          <form action={action} className="mt-6 grid gap-4">
            {isSignup && (
              <div>
                <label htmlFor="name" className="mb-1 block text-xs font-medium">
                  Name
                </label>
                <input id="name" name="name" autoComplete="name" required maxLength={80} className="input" />
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium">
                Email
              </label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input" />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={isSignup ? 8 : undefined}
                className="input"
              />
              {isSignup && <p className="mt-1 text-xs text-neutral-500">At least 8 characters, with a letter and a number.</p>}
            </div>
            {state.error && (
              <p role="alert" className="text-sm text-red-600">
                {state.error}
              </p>
            )}
            <button className="btn-primary w-full" disabled={pending}>
              {pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-neutral-500">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-violet-600 hover:underline">
            {isSignup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </main>
  );
}
