import { cookies } from "next/headers";
import { decodeSession, type SessionPayload } from "../sessionToken";
import { env } from "./env";

export const SESSION_COOKIE = "renewly_session";
export const OAUTH_STATE_COOKIE = "renewly_oauth_state";

export { encodeSession } from "../sessionToken";
export type { SessionPayload };

/** Current session from the request cookies, or null when signed out. */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value, env.authSecret);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
