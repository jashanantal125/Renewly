import { NextResponse } from "next/server";
import { isAuthConfigured, isMailConfigured } from "@/lib/server/env";
import { getSession } from "@/lib/server/session";
import { getUser, setEmailReminders } from "@/lib/server/users";

export const runtime = "nodejs";

/**
 * Session for the client UI.
 *
 * `configured` lets the page hide the sign-in call to action entirely when the
 * deployment has no OAuth credentials, instead of offering a button that fails.
 */
export async function GET() {
  const authConfigured = isAuthConfigured();
  const session = authConfigured ? await getSession() : null;

  if (!session) {
    return NextResponse.json({
      configured: authConfigured,
      mailConfigured: isMailConfigured(),
      user: null,
    });
  }

  // The signed cookie already proves who this is, so a database outage should
  // degrade to showing the account rather than breaking the header entirely.
  let stored: Awaited<ReturnType<typeof getUser>> = null;
  try {
    stored = await getUser(session.sub);
  } catch (error) {
    console.error("Could not load user preferences", error);
  }

  return NextResponse.json({
    configured: true,
    mailConfigured: isMailConfigured(),
    user: {
      email: session.email,
      name: session.name ?? null,
      picture: session.picture ?? null,
      emailRemindersEnabled: stored?.emailRemindersEnabled ?? true,
      lastEmailedAt: stored?.lastEmailedAt ?? null,
    },
  });
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
