import { NextResponse } from "next/server";
import {
  env,
  googleRedirectUri,
  isAuthConfigured,
  resolveAppUrl,
} from "@/lib/server/env";
import {
  AUTH_ERROR_COOKIE,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  encodeSession,
  sessionCookieOptions,
} from "@/lib/server/session";
import { upsertUser } from "@/lib/server/users";

export const runtime = "nodejs";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface IdTokenClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Read the claims out of an id_token without verifying its signature.
 *
 * OpenID Connect allows this when the token came straight from the token
 * endpoint over TLS (we made that request ourselves, so there is no untrusted
 * party in between). Verifying would mean fetching and caching Google's JWKS
 * for no additional safety here.
 */
function decodeIdToken(idToken: string): IdTokenClaims | null {
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  try {
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as IdTokenClaims;
  } catch {
    return null;
  }
}

/**
 * Send the user home with the reason in a one-shot cookie rather than the URL,
 * so refreshing the page cannot replay an error that has already been handled.
 */
function failure(request: Request, reason: string) {
  const response = NextResponse.redirect(new URL(resolveAppUrl(request)));
  response.cookies.set(AUTH_ERROR_COOKIE, reason, {
    ...sessionCookieOptions,
    maxAge: 120,
  });
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

/** Step 2: Google redirects back with a code, which we swap for an id_token. */
export async function GET(request: Request) {
  if (!isAuthConfigured()) {
    return failure(request, "not_configured");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.split("=")[1];

  if (url.searchParams.get("error")) {
    return failure(request, "denied");
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return failure(request, "bad_state");
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId!,
      client_secret: env.googleClientSecret!,
      redirect_uri: googleRedirectUri(request),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return failure(request, "token_exchange_failed");
  }

  const tokens = (await tokenResponse.json()) as { id_token?: string };
  const claims = tokens.id_token ? decodeIdToken(tokens.id_token) : null;

  if (!claims?.sub || !claims.email) {
    return failure(request, "no_profile");
  }
  // Without a verified address the reminder email could go to someone else.
  if (claims.email_verified === false) {
    return failure(request, "email_unverified");
  }

  // Signing in without a stored user would leave nothing for the reminder job
  // to read, so a storage failure has to fail the sign-in rather than pass it.
  try {
    await upsertUser({
      sub: claims.sub,
      email: claims.email,
      name: claims.name,
      picture: claims.picture,
    });
  } catch (error) {
    console.error("Could not store user on sign-in", error);
    return failure(request, "storage_failed");
  }

  const session = encodeSession(
    {
      sub: claims.sub,
      email: claims.email,
      name: claims.name,
      picture: claims.picture,
    },
    env.authSecret!,
  );

  const response = NextResponse.redirect(new URL(resolveAppUrl(request)));
  response.cookies.set(SESSION_COOKIE, session.value, {
    ...sessionCookieOptions,
    maxAge: session.maxAge,
  });
  response.cookies.delete(OAUTH_STATE_COOKIE);

  return response;
}
