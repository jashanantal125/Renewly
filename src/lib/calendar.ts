import { diffCalendarDays, formatLocalDate, parseLocalDate, startOfToday } from "./dates";
import { buildReminderView, nextRenewalDate } from "./reminders";
import type { ReminderView, Renewal } from "./types";

/** One occurrence of a renewal on a specific calendar day. */
export interface CalendarEntry {
  renewal: Renewal;
  /** Urgency of the renewal's *current* due date, not of this occurrence. */
  view: ReminderView;
  iso: string;
  /** True for later cycles we projected forward, e.g. next month's Netflix. */
  isProjected: boolean;
}

export interface CalendarDay {
  iso: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
}

export interface CalendarMonth {
  year: number;
  /** 0-indexed, matching Date#getMonth. */
  month: number;
  label: string;
  weeks: CalendarDay[][];
}

/** Weeks start Monday, so Sunday (0) maps to the last column. */
function mondayOffset(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const shifted = new Date(year, month + delta, 1);
  return { year: shifted.getFullYear(), month: shifted.getMonth() };
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Expand a recurring renewal across [startIso, endIso].
 *
 * The stored renewalDate is the real next due date; anything after it is a
 * projection so browsing future months still shows monthly subscriptions.
 * Capped to keep a short cycle from looping forever on a wide range.
 */
export function projectOccurrencesInRange(
  renewal: Renewal,
  startIso: string,
  endIso: string,
  maxOccurrences = 200,
): { iso: string; isProjected: boolean }[] {
  const start = parseLocalDate(startIso);
  const end = parseLocalDate(endIso);
  const occurrences: { iso: string; isProjected: boolean }[] = [];

  let currentIso = renewal.renewalDate;
  let isProjected = false;

  for (let i = 0; i < maxOccurrences; i += 1) {
    const current = parseLocalDate(currentIso);

    if (diffCalendarDays(current, end) < 0) break;

    if (diffCalendarDays(start, current) >= 0) {
      occurrences.push({ iso: currentIso, isProjected });
    }

    const next = nextRenewalDate(
      currentIso,
      renewal.cycle,
      renewal.customCycleDays,
    );
    if (!next) break;

    currentIso = next;
    isProjected = true;
  }

  return occurrences;
}

/**
 * Build a fixed 6-week grid for the given month, with each renewal's
 * occurrences attached to their day.
 *
 * The grid is always 42 cells so the panel height never jumps between months.
 */
export function buildCalendarMonth(
  renewals: Renewal[],
  year: number,
  month: number,
  now: Date = new Date(),
): CalendarMonth {
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - mondayOffset(firstOfMonth));
  const gridEnd = new Date(
    gridStart.getFullYear(),
    gridStart.getMonth(),
    gridStart.getDate() + 41,
  );

  const startIso = formatLocalDate(gridStart);
  const endIso = formatLocalDate(gridEnd);
  const todayIso = formatLocalDate(startOfToday(now));

  const entriesByDate = new Map<string, CalendarEntry[]>();
  for (const renewal of renewals) {
    const view = buildReminderView(renewal, now);
    for (const occurrence of projectOccurrencesInRange(
      renewal,
      startIso,
      endIso,
    )) {
      const bucket = entriesByDate.get(occurrence.iso) ?? [];
      bucket.push({
        renewal,
        view,
        iso: occurrence.iso,
        isProjected: occurrence.isProjected,
      });
      entriesByDate.set(occurrence.iso, bucket);
    }
  }

  const weeks: CalendarDay[][] = [];
  for (let week = 0; week < 6; week += 1) {
    const days: CalendarDay[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + week * 7 + weekday,
      );
      const iso = formatLocalDate(date);
      days.push({
        iso,
        dayOfMonth: date.getDate(),
        inCurrentMonth: date.getMonth() === month,
        isToday: iso === todayIso,
        entries: entriesByDate.get(iso) ?? [],
      });
    }
    weeks.push(days);
  }

  return { year, month, label: monthLabel(year, month), weeks };
}

/**
 * Every occurrence inside the visible month, in date order.
 *
 * Days that spill in from the neighbouring months are excluded so the list
 * matches the month heading. Overdue items earlier in the month are kept —
 * they are still the most actionable thing on the page.
 */
export function monthEntries(calendar: CalendarMonth): CalendarEntry[] {
  return calendar.weeks
    .flat()
    .filter((day) => day.inCurrentMonth)
    .flatMap((day) => day.entries);
}

export function findDay(
  calendar: CalendarMonth,
  iso: string,
): CalendarDay | null {
  for (const week of calendar.weeks) {
    for (const day of week) {
      if (day.iso === iso) return day;
    }
  }
  return null;
}

/** Long-form date for the detail header, e.g. "Fri, 14 Aug 2026". */
export function formatFullDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export type { ReminderView };
