import { cookies } from "next/headers";
import { sessionStore, TTL_MS, type SessionData } from "./store";

export const COOKIE = "qs_session";
export async function getSession() {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  const d = await sessionStore.get(id);
  return d ? { id, ...d } : null;
}
export async function startSession(data: SessionData) {
  const jar = await cookies();
  const old = jar.get(COOKIE)?.value;
  if (old) await sessionStore.destroy(old); // rotate on every new profile
  const id = await sessionStore.create(data);
  jar.set(COOKIE, id, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL_MS / 1000 });
}
export async function endSession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await sessionStore.destroy(id);
  jar.delete(COOKIE);
}
