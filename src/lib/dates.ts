/**
 * Date helpers that work on calendar dates (YYYY-MM-DD) in local time.
 * We avoid Date.UTC surprises for "renewal on the 15th" semantics.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse YYYY-MM-DD as a local calendar date at midnight. */
export function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) {
    throw new Error(`Invalid date: ${isoDate}`);
  }
  return new Date(y, m - 1, d);
}

/** Format a Date as YYYY-MM-DD in local time. */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today's local calendar date (midnight). */
export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Whole calendar days from `from` to `to`.
 * Positive = future, negative = past, 0 = same day.
 */
export function diffCalendarDays(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/** Add N calendar days to a date. */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

/** Add N calendar months, clamping end-of-month (Jan 31 + 1m → Feb 28/29). */
export function addMonths(date: Date, months: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth() + months;
  const day = date.getDate();
  const target = new Date(y, m, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

export function todayIso(now: Date = new Date()): string {
  return formatLocalDate(startOfToday(now));
}
