# Renewly

One place for road tax, licence, passport, insurance, and subscription renewals — with smart nudges before anything lapses.

Built for the [Shortcut Asia](https://shortcut.my) internship challenge (topic 02: Renewal Reminder).

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS** for UI
- **localStorage** for persistence (no backend required)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test      # core reminder engine tests
npm run build # production build
npm start     # serve production build
```

## What it does

1. **Add renewals** — name, type, date, cycle (once / monthly / yearly / custom)
2. **Reminder view** — a summary bar plus items grouped by urgency: Overdue → Act now → Coming up → Later
3. **Calendar view** — month grid of what is due, with per-item detail explaining its bucket
4. **Notifications** — only items inside their reminder window, dismissable without going silent forever

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
```

Every rule lives in `src/lib` as pure functions with tests; components only
render what those functions return.

## Known limits

- Data is per-browser (localStorage); no accounts or sync.
- Nudges are in-app only — there is no push or email delivery, so the app has
  to be opened for a reminder to be seen.
- Urgency is computed when the page renders, so a tab left open overnight will
  not reclassify until it is reloaded.
- Cycle projection is capped at 200 occurrences per item per view, so a very
  short custom cycle on a long-overdue item may not render every date.

## Project status

Core workflow is working: add / edit / delete / renew, summary bar, grouped
reminder digest, calendar with per-item detail, and notifications with
conditional dismissal. 30 tests cover the logic in `src/lib`.
