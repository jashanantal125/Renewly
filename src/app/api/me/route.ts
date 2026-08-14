import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAuthConfigured, isMailConfigured } from "@/lib/server/env";
import {
  AUTH_ERROR_COOKIE,
  getSession,
  sessionCookieOptions,
} from "@/lib/server/session";
import { getUser, setEmailReminders } from "@/lib/server/users";

export const runtime = "nodejs";

/**
 * Session for the client UI.
 *
 * `configured` lets the page hide the sign-in call to action entirely when the
 * deployment has no OAuth credentials, instead of offering a button that fails.
 *
 * `authError` is a flash message: it is returned once and cleared in the same
 * response, so a failed sign-in is explained exactly once and a refresh shows a
 * clean page instead of replaying it.
 */
export async function GET() {
  const authConfigured = isAuthConfigured();
  const session = authConfigured ? await getSession() : null;
  const jar = await cookies();
  const authError = jar.get(AUTH_ERROR_COOKIE)?.value ?? null;

  const payload = {
    configured: authConfigured,
    mailConfigured: isMailConfigured(),
    authError,
    user: null as null | {
      email: string;
      name: string | null;
      picture: string | null;
      emailRemindersEnabled: boolean;
      lastEmailedAt: string | null;
    },
  };

  if (session) {
    // The signed cookie already proves who this is, so a database outage should
    // degrade to showing the account rather than breaking the header entirely.
    let stored: Awaited<ReturnType<typeof getUser>> = null;
    try {
      stored = await getUser(session.sub);
    } catch (error) {
      console.error("Could not load user preferences", error);
    }

    payload.user = {
      email: session.email,
      name: session.name ?? null,
      picture: session.picture ?? null,
      emailRemindersEnabled: stored?.emailRemindersEnabled ?? true,
      lastEmailedAt: stored?.lastEmailedAt ?? null,
    };
  }

  const response = NextResponse.json(payload);
  if (authError) {
    response.cookies.set(AUTH_ERROR_COOKIE, "", {
      ...sessionCookieOptions,
      maxAge: 0,
    });
  }
  return response;
}

/** Toggle email reminders without signing out. */
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    emailRemindersEnabled?: unknown;
  } | null;

  if (typeof body?.emailRemindersEnabled !== "boolean") {
    return NextResponse.json(
      { error: "emailRemindersEnabled must be a boolean" },
      { status: 400 },
    );
  }

  await setEmailReminders(session, body.emailRemindersEnabled);
  return NextResponse.json({ ok: true });
}
