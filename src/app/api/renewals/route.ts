import { NextResponse } from "next/server";
import { parseRenewalList } from "@/lib/validateRenewal";
import { getSession } from "@/lib/server/session";
import { getUser, replaceRenewals } from "@/lib/server/users";

export const runtime = "nodejs";

/** The list the reminder job will read. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await getUser(session.sub);
  return NextResponse.json({ renewals: user?.renewals ?? [] });
}

/**
 * Mirror the browser's list to the server.
 *
 * The browser stays the source of truth and this replaces the stored copy
 * wholesale — last write wins. That is a deliberate simplification: it keeps
 * the offline app working unchanged, at the cost of no cross-device merging.
 */
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    renewals?: unknown;
  } | null;

  const renewals = parseRenewalList(body?.renewals);
  if (!renewals) {
    return NextResponse.json(
      { error: "Invalid renewals payload" },
      { status: 400 },
    );
  }

  await replaceRenewals(session, renewals);
  return NextResponse.json({ ok: true, count: renewals.length });
}
