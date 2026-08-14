import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { env, googleRedirectUri, isAuthConfigured } from "@/lib/server/env";
import { OAUTH_STATE_COOKIE, sessionCookieOptions } from "@/lib/server/session";

export const runtime = "nodejs";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/**
 * Step 1 of the OAuth authorization code flow: send the user to Google.
 *
 * We only ask for identity scopes. Renewly sends mail from its own account, so
 * it never needs permission to act on the user's Gmail.
 */
export async function GET(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Google sign-in is not configured on this deployment." },
      { status: 503 },
    );
  }

  // Random state, echoed back by Google, proves the callback follows our redirect.
  const state = randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_id: env.googleClientId!,
    redirect_uri: googleRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    // Always show the picker so switching accounts is possible.
    prompt: "select_account",
  });

  const response = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    ...sessionCookieOptions,
    maxAge: 60 * 10,
  });

  return response;
}
