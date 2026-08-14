import { NextResponse } from "next/server";
import { buildHtml, buildSubject, buildText } from "@/lib/emailTemplate";
import { buildReminderDigest } from "@/lib/reminders";
import { isMailConfigured, resolveAppUrl } from "@/lib/server/env";
import { sendEmail } from "@/lib/server/mailer";
import { sendEmailRateLimit } from "@/lib/server/rateLimit";
import { getSession } from "@/lib/server/session";
import { getUser } from "@/lib/server/users";

export const runtime = "nodejs";

/**
 * Sends the signed-in user a preview of their current reminders.
 *
 * This exists so email delivery can be demonstrated without waiting for the
 * daily job. It deliberately does *not* record anything as emailed, so it
 * cannot silence a real reminder.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: "Email is not configured on this deployment." },
      { status: 503 },
    );
  }
  if (!sendEmailRateLimit.allow(session.sub)) {
    return NextResponse.json(
      { error: "Too many test emails. Try again in a minute." },
      { status: 429 },
    );
  }

  const user = await getUser(session.sub);
  const digest = buildReminderDigest(user?.renewals ?? []);
  const views = digest.filter((view) => view.shouldNudge);
  const preview = views.length > 0 ? views : digest.slice(0, 3);

  if (preview.length === 0) {
    return NextResponse.json(
      { error: "Add a renewal first so there is something to send." },
      { status: 400 },
    );
  }

  try {
    await sendEmail({
      to: session.email,
      subject: buildSubject(preview),
      html: buildHtml(preview, resolveAppUrl(request)),
      text: buildText(preview, resolveAppUrl(request)),
    });
  } catch (error) {
    console.error("Test email failed", error);
    return NextResponse.json(
      { error: "Could not send the email. Check the mail credentials." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, sent: preview.length });
}
