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
2. **Reminder view** — items sorted into urgency buckets: Overdue → Act now → Coming up → Later
3. **Calendar view** — month grid of what is due, with per-item detail explaining its bucket

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

## Calendar view

The calendar button in the header opens a month grid. Each day shows a dot per
renewal, coloured by urgency; clicking a day lists what is due, and clicking an
item explains *why* it sits in that bucket.

Two decisions worth calling out:

- **Projected cycles.** Recurring items are expanded across the visible month
  range, so browsing ahead shows next month's subscription even though only one
  due date is stored. Projected occurrences are dimmed and labelled.
- **Urgency is measured from the real due date**, never from a projected one.
  A subscription due next week stays "act now" even when you are looking at its
  December occurrence.

## Architecture

```
UI (page.tsx, components/CalendarPanel.tsx)
  → storage.ts + useRenewals.ts (localStorage)
  → renewals.ts (create/update)
  → reminders.ts (urgency + digest + explanations)
  → calendar.ts (month grid + cycle projection)
  → leadTimes.ts + dates.ts + types.ts
```

## Known limits

- Data is per-browser (localStorage); no accounts or sync.
- Nudges are in-app only — there is no push or email delivery.
- Cycle projection is capped at 200 occurrences per item per view, so a very
  short custom cycle on a long-overdue item may not render every date.

## Project status

Core workflow is working: add / edit / delete / renew, smart reminder digest,
and a calendar with per-item detail.
