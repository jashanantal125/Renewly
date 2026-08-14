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
npm run build   # production build
npm start       # serve production build
```

## Core idea

A reminder is only useful if it lands with enough lead time to act — and without drowning you in alerts. Renewly uses type-based lead times and urgency buckets instead of a flat “remind me 7 days before everything.”

## Project status

Scaffold + core reminder engine in progress.
