import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashToken, newSessionToken } from "./password";
import { getStore } from "./store";
import { toPublicUser, type PublicUser } from "./types";

export const SESSION_COOKIE = "session";

export async function startSession(userId: string) {
  const token = newSessionToken();
  const session = await getStore().createSession(userId, hashToken(token));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getStore().deleteSession(hashToken(token));
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const store = getStore();
  const session = await store.findSession(hashToken(token));
  if (!session) return null;
  const user = await store.getUser(session.userId);
  return user ? toPublicUser(user) : null;
}

// For pages: send signed-out visitors to the login page.
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
