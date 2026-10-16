import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create account" };

export default async function Page() {
  if (await getCurrentUser()) redirect("/");
  return <AuthForm mode="signup" />;
}
