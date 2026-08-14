import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { planReminderEmails } from "@/lib/emailReminders";
import { buildHtml, buildSubject, buildText } from "@/lib/emailTemplate";
import { env, isMailConfigured, resolveAppUrl } from "@/lib/server/env";
import { sendEmail } from "@/lib/server/mailer";
import { listUsersForReminders, recordEmailedNudges } from "@/lib/server/users";

export const runtime = "nodejs";
// Never cache: the answer depends on today's date.
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  if (!env.cronSecret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.cronSecret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Daily reminder job.
 *
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. It is the
 * only part of the system that can reach the user when the app is closed, so it
 * is also the only part that must be idempotent: `planReminderEmails` decides
 * what has not been said yet, and the result is written back only after a
 * successful send.
 */
async function runJob(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: "Mail is not configured" },
      { status: 503 },
    );
  }

  const appUrl = resolveAppUrl(request);
  const users = await listUsersForReminders();

  let emailed = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const user of users) {
    const plan = planReminderEmails(
      user.renewals ?? [],
      user.emailedNudges ?? {},
    );

    if (plan.views.length === 0) {
      skipped += 1;
      continue;
    }

    try {
      await sendEmail({
        to: user.email,
        subject: buildSubject(plan.views),
        html: buildHtml(plan.views, appUrl),
        text: buildText(plan.views, appUrl),
      });
      // Only recorded after the send succeeds, so a failure retries tomorrow.
      await recordEmailedNudges(user._id, plan.nextEmailedNudges);
      emailed += 1;
    } catch (error) {
      failures.push(user._id);
      console.error("Reminder email failed", user._id, error);
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    users: users.length,
    emailed,
    skipped,
    failed: failures.length,
  });
}

export async function GET(request: Request) {
  return runJob(request);
}

/** POST too, so the job can be triggered manually with curl during a demo. */
export async function POST(request: Request) {
  return runJob(request);
}
