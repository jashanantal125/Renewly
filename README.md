# Renewly

One place for road tax, licence, passport, insurance, and subscription renewals — with smart nudges before anything lapses.

Built for the [Shortcut Asia](https://shortcut.my) internship challenge (topic 02: Renewal Reminder).

**Thinking document (approach, decisions, flowcharts, AI use):** [THINKING.md](./THINKING.md)

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS** for UI
- **localStorage** for persistence — the app is fully usable with no backend
- **MongoDB + Gmail SMTP** (optional) for emailed reminders

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No configuration is needed:
without credentials the app runs as a local tracker and the email sign-in button
is hidden.

```bash
npm test      # 57 tests over the logic in src/lib
npm run build # production build
npm start     # serve production build
```

## Optional: emailed reminders

In-app nudges only work if you open the app. Signing in with Google mirrors your
list to the server so a daily job can email you instead. To enable it, copy
`.env.example` to `.env.local` and fill it in:

| Variable | Where it comes from |
|----------|--------------------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials → OAuth client ID (Web). Add `http://localhost:3000/api/auth/callback/google` as an authorised redirect URI. |
| `AUTH_SECRET` | `openssl rand -base64 32` — signs the session cookie |
| `MONGODB_URI` | A MongoDB Atlas free cluster, or a local `mongod` |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | A Gmail account and an [App Password](https://myaccount.google.com/apppasswords) (needs 2FA on) |
| `CRON_SECRET` | `openssl rand -hex 32` — protects the job route |

Then trigger the job manually instead of waiting for the schedule:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
# → {"ok":true,"users":1,"emailed":1,"skipped":0,"failed":0}
```

On Vercel, `vercel.json` schedules the same route daily at 00:00 UTC (08:00 MYT)
and Vercel Cron supplies that `Authorization` header from `CRON_SECRET`
automatically.

## What it does

1. **Add renewals** — name, type, date, cycle (once / monthly / yearly / custom)
2. **Reminder view** — a summary bar plus items grouped by urgency: Overdue → Act now → Coming up → Later
3. **Calendar view** — month grid of what is due, with per-item detail explaining its bucket
4. **Notifications** — only items inside their reminder window, dismissable without going silent forever
5. **Emailed reminders** (optional) — sign in with Google and a daily job emails you when something enters its window

## The hard part

A reminder is only useful if it lands with enough lead time to act, without drowning you in alerts.

Renewly rejects a flat “remind 7 days before everything” rule. Instead:

| Type | Default lead time | Action window |
|------|-------------------|---------------|
| Passport | 90 days | 21 days |
| Licence | 60 days | 14 days |
| Road tax / Insurance | 30 days | 7 days |
| Other | 14 days | 5 days |
| Subscription | 7 days | 2 days |

- **Coming up** starts when days-until ≤ lead time
- **Act now** escalates when days-until ≤ action window
- Optional per-item lead-time override
- Marking a recurring item **Renewed** advances it to the next cycle (with end-of-month clamping)

Core logic lives in `src/lib/` (pure functions + tests). The UI is a thin client over that engine.

## Reading the list

Each card carries a progress bar showing how far the item has moved through its
reminder window, with a caption like "4 of 7 days left to act" or "Nudges start
in 50 days". That turns the lead-time rule from a number in the code into
something visible per item, and it is why the cards are worth more than a plain
sorted list.

Under the heading, a "Set reminders for →" label points at a sliding row of the
types Renewly tracks. It answers "what is this for" in one glance. Lead times
are deliberately not shown there — a marquee is the wrong place to read numbers
you cannot act on. They appear where they matter instead: beside each option in
the form, in the dialog subtitle as you pick a type, and on every saved card.

## Saving feedback

Adding a renewal opens a centered dialog rather than pushing the page around,
and saving raises a toast that names *when the first nudge will land*, e.g.
"First nudge in 50 days on 3 Oct 2026, 90 days before it is due."

That wording is deliberate. A bare "Saved" tells the user nothing about whether
the app will actually reach them in time, which is the one promise this app
makes. The toast carries a progress bar so its auto-dismiss is visible instead
of the message just disappearing. Overdue and already-nudging items get their
own phrasing rather than a made-up future date.

## Notifications

The bell shows a count of items currently inside their reminder window — the
same `shouldNudge` rule the digest uses, so there is one nudge per renewal
rather than one per day.

Dismissing is deliberately conditional. An acknowledgement records the due date
*and* the urgency that were showing at the time, and it stops applying when
either changes for the worse:

- the item escalates (coming up → act now), or
- the item moves to its next cycle after being renewed

Otherwise a single dismissal would silence something right up to the day it
lapses, which is the exact failure this app exists to prevent. Becoming *less*
urgent does not resurface it.

## Email reminders

A reminder that only exists inside the app fails the person who never opens it.
Signing in with Google turns the same nudges into email.

The interesting part is what decides *when* to email. The job runs daily, so the
question is not "what is due" but "what have I not already said" — which is
exactly what the notification bell already answers. `planReminderEmails` hands
the record of previously **emailed** nudges to the same `buildNotifications`
function the UI uses for **dismissed** nudges:

```23:35:src/lib/emailReminders.ts
export function planReminderEmails(
  renewals: Renewal[],
  emailedNudges: AckMap,
  now: Date = new Date(),
): EmailPlan {
  const digest = buildReminderDigest(renewals, now);
  const views = buildNotifications(digest, emailedNudges);

  return {
    views,
    nextEmailedNudges: acknowledgeAll(emailedNudges, views),
  };
}
```

So email inherits the rules for free: one email per renewal per urgency step, a
fresh email when something escalates to *act now* or rolls into its next cycle,
and silence otherwise. No second timing system to keep in step with the first.

Other decisions worth calling out:

- **The browser stays the source of truth.** Signing in mirrors your list to the
  server (one-way, whole list, debounced) because the job cannot read
  localStorage. Signed out, nothing changes. The cost is last-write-wins across
  devices.
- **Emails are recorded only after they send.** A mail outage retries tomorrow
  rather than marking the reminder as delivered.
- **Sessions are a signed cookie**, HMAC-SHA256 with a constant-time compare, so
  there is no session table to keep in sync. Signed, not encrypted — it holds
  only what the UI already displays.
- **OAuth is hand-rolled** (~120 lines) rather than a library, so every step is
  explainable: `state` cookie for CSRF, server-to-server code exchange, claims
  read from the `id_token`.
- **The button is hidden when unconfigured.** With no credentials, `/api/me`
  reports `configured: false` and no sign-in is offered at all.
- **The subject line names the most urgent item** ("Road tax — in 6 days"),
  because a generic subject gets ignored in a full inbox.

## Summary bar

Four counts at the top: total, overdue, due soon, upcoming. "Due soon" merges
act-now and coming-up on purpose — from the top of the page the useful question
is how many things need you, and the finer split is one scroll away.

## Calendar view

The calendar button in the header opens a month grid. Each day shows a dot per
renewal, coloured by urgency. Below the grid is everything due in the visible
month in date order; clicking a day narrows the list to that day, and clicking
an item explains *why* it sits in that bucket.

Two decisions worth calling out:

- **Projected cycles.** Recurring items are expanded across the visible month
  range, so browsing ahead shows next month's subscription even though only one
  due date is stored. Projected occurrences are dimmed and labelled.
- **Urgency is measured from the real due date**, never from a projected one.
  A subscription due next week stays "act now" even when you are looking at its
  December occurrence.

## Architecture

```
UI (app/page.tsx, components/*)
  → useRenewals.ts → localStore.ts → storage.ts (localStorage)
  → renewals.ts    (create/update)
  → reminders.ts   (urgency + digest + summary + explanations)
  → notifications.ts (which nudges to show, acknowledgements)
  → calendar.ts    (month grid + cycle projection)
  → leadTimes.ts + dates.ts + types.ts
  → useRenewalSync.ts (mirrors the list to the server when signed in)

Server — only needed for email
  api/auth/google + api/auth/callback/google  OAuth → signed session cookie
  api/me                                      session, prefs
  api/renewals                                stored copy of the list
  api/cron/reminders                          daily job, CRON_SECRET
    → emailReminders.ts (reuses notifications.ts)
    → emailTemplate.ts  → server/mailer.ts (Gmail SMTP)
    → server/users.ts   (MongoDB, one document per user)
```

Every rule lives in `src/lib` as pure functions with tests; components only
render what those functions return, and the daily job calls the same functions
the UI does. Anything touching credentials or the database is confined to
`src/lib/server/`.

## Known limits

- **Sync is last-write-wins** — two devices on one account overwrite each other
  rather than merging.
- **The job runs daily in UTC** and lead times are whole days, so an email can
  arrive up to 24h after an item enters its window. No per-user timezone yet.
- **Renewals are stored in plain text.** They are low-sensitivity, but a real
  product should encrypt at rest.
- **No unsubscribe link in the email** — the toggle lives in the app.
- **The test-email rate limit is per-instance**, so it is not a real defence
  across serverless instances.
- Signed out, data is per-browser (localStorage) with no sync.
- Urgency is computed when the page renders, so a tab left open overnight will
  not reclassify until it is reloaded.
- Cycle projection is capped at 200 occurrences per item per view, so a very
  short custom cycle on a long-overdue item may not render every date.

## Project status

Core workflow is working: add / edit / delete / renew, summary bar, grouped
reminder digest, calendar with per-item detail, notifications with conditional
dismissal, and optional Google sign-in with a daily reminder email. 57 tests
cover the logic in `src/lib`, including the session cookie and the sync payload
validation.
