import { cookies } from "next/headers";
import { decodeSession, type SessionPayload } from "../sessionToken";
import { env } from "./env";

export const SESSION_COOKIE = "renewly_session";
export const OAUTH_STATE_COOKIE = "renewly_oauth_state";
/**
 * One-shot reason for a failed sign-in.
 *
 * The OAuth callback cannot render UI. Carrying the reason in the query string
 * meant a refresh replayed a stale error and the URL could be shared with it, so
 * it travels in a short-lived cookie that is cleared the first time it is read.
 */
export const AUTH_ERROR_COOKIE = "renewly_auth_error";

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
