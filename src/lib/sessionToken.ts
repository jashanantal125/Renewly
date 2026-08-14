import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signing and verifying the session cookie.
 *
 * Kept apart from the cookie helpers in `server/session.ts` so this stays a pure
 * pair of functions with no framework imports, and can be unit tested directly.
 */

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface SessionPayload {
  /** Google's stable user id (the `sub` claim). */
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  /** Expiry as a unix timestamp in seconds. */
  exp: number;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/**
 * A signed JSON payload rather than a database-backed session id: there is no
 * server state to keep in sync, and the signature is enough to prove the cookie
 * came from us. It is signed but not encrypted, so it holds only what the UI
 * already displays.
 */
export function encodeSession(
  payload: Omit<SessionPayload, "exp">,
  secret: string,
  now: Date = new Date(),
): { value: string; maxAge: number } {
  const body: SessionPayload = {
    ...payload,
    exp: Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");

  return {
    value: `${encoded}.${sign(encoded, secret)}`,
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function decodeSession(
  cookieValue: string | undefined,
  secret: string | undefined,
  now: Date = new Date(),
): SessionPayload | null {
  if (!cookieValue || !secret) return null;

  const [encoded, signature] = cookieValue.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // Constant-time compare, so a wrong signature cannot be guessed byte by byte.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (!payload.sub || !payload.email) return null;
    if (payload.exp * 1000 < now.getTime()) return null;

    return payload;
  } catch {
    return null;
  }
}
