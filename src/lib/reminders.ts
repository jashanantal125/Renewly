import {
  addDays,
  addMonths,
  addYears,
  diffCalendarDays,
  formatLocalDate,
  parseLocalDate,
  startOfToday,
} from "./dates";
import { getActionWindow, getDefaultLeadTime } from "./leadTimes";
import type {
  ReminderView,
  Renewal,
  RenewalCycle,
  Urgency,
} from "./types";
import { URGENCY_ORDER } from "./types";

const URGENCY_LABELS: Record<Urgency, string> = {
  overdue: "Overdue",
  act_now: "Act now",
  soon: "Coming up",
  later: "Later",
};

/**
 * Resolve effective lead time: user override wins, else type default.
 */
export function resolveLeadTime(renewal: Renewal): number {
  if (
    renewal.leadTimeOverrideDays != null &&
    renewal.leadTimeOverrideDays >= 0
  ) {
    return renewal.leadTimeOverrideDays;
  }
  return getDefaultLeadTime(renewal.type);
}

/**
 * Decide urgency from days-until and lead/action windows.
 *
 * Buckets:
 * - overdue:  past the renewal date
 * - act_now:  inside the action window (too tight to wait)
 * - soon:     inside the lead-time window (nudge starts here)
 * - later:    still outside the lead-time window
 *
 * This is the hard part of Renewly: not every item should shout
 * the same number of days early.
 */
export function classifyUrgency(
  daysUntil: number,
  leadTimeDays: number,
  actionWindowDays: number,
): Urgency {
  if (daysUntil < 0) return "overdue";

  // Action window never exceeds lead time — avoid inverted buckets.
  const actThreshold = Math.min(actionWindowDays, leadTimeDays);

  if (daysUntil <= actThreshold) return "act_now";
  if (daysUntil <= leadTimeDays) return "soon";
  return "later";
}

/**
 * Build the reminder view for a single renewal as of `now`.
 */
export function buildReminderView(
  renewal: Renewal,
  now: Date = new Date(),
): ReminderView {
  const today = startOfToday(now);
  const renewalDay = parseLocalDate(renewal.renewalDate);
  const daysUntil = diffCalendarDays(today, renewalDay);
  const leadTimeDays = resolveLeadTime(renewal);
  const actionWindowDays = getActionWindow(renewal.type);
  const urgency = classifyUrgency(daysUntil, leadTimeDays, actionWindowDays);

  return {
    renewal,
    daysUntil,
    leadTimeDays,
    urgency,
    urgencyLabel: URGENCY_LABELS[urgency],
    shouldNudge: urgency === "overdue" || urgency === "act_now" || urgency === "soon",
  };
}

/**
 * Sort reminders: urgency first, then soonest date, then name.
 * Used for the "what's coming up" digest so the user sees
 * one ordered list instead of many competing alerts.
 */
export function sortReminders(views: ReminderView[]): ReminderView[] {
  return [...views].sort((a, b) => {
    const urgencyDiff =
      URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency);
    if (urgencyDiff !== 0) return urgencyDiff;
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return a.renewal.name.localeCompare(b.renewal.name);
  });
}

export function buildReminderDigest(
  renewals: Renewal[],
  now: Date = new Date(),
): ReminderView[] {
  return sortReminders(renewals.map((r) => buildReminderView(r, now)));
}

/** Group a digest into urgency buckets for the UI. */
export function groupByUrgency(
  views: ReminderView[],
): Record<Urgency, ReminderView[]> {
  const groups: Record<Urgency, ReminderView[]> = {
    overdue: [],
    act_now: [],
    soon: [],
    later: [],
  };
  for (const view of views) {
    groups[view.urgency].push(view);
  }
  return groups;
}

/**
 * Advance a renewal to its next cycle date after the user marks it done.
 * One-time renewals stay put (caller should delete or archive).
 */
export function nextRenewalDate(
  currentIso: string,
  cycle: RenewalCycle,
  customCycleDays?: number,
): string | null {
  if (cycle === "once") return null;

  const current = parseLocalDate(currentIso);

  if (cycle === "monthly") {
    return formatLocalDate(addMonths(current, 1));
  }
  if (cycle === "yearly") {
    return formatLocalDate(addYears(current, 1));
  }
  if (cycle === "custom") {
    const days = customCycleDays ?? 0;
    if (days <= 0) return null;
    return formatLocalDate(addDays(current, days));
  }

  return null;
}

export function markRenewalDone(renewal: Renewal, now: Date = new Date()): Renewal {
  const next = nextRenewalDate(
    renewal.renewalDate,
    renewal.cycle,
    renewal.customCycleDays,
  );

  if (!next) {
    // One-time: keep date, caller decides whether to remove.
    return {
      ...renewal,
      updatedAt: now.toISOString(),
    };
  }

  return {
    ...renewal,
    renewalDate: next,
    updatedAt: now.toISOString(),
  };
}

/**
 * Plain-English reason for the bucket, so the user can see why an item
 * nudges when it does instead of trusting an opaque colour.
 */
export function explainUrgency(view: ReminderView): string {
  const { daysUntil, leadTimeDays, urgency } = view;
  const actionWindow = Math.min(
    getActionWindow(view.renewal.type),
    leadTimeDays,
  );

  if (urgency === "overdue") {
    return `This lapsed ${Math.abs(daysUntil)} day${
      Math.abs(daysUntil) === 1 ? "" : "s"
    } ago. Renew as soon as you can.`;
  }
  if (urgency === "act_now") {
    return `Only ${daysUntil} day${
      daysUntil === 1 ? "" : "s"
    } left, and this type usually takes about ${actionWindow} days to sort out.`;
  }
  if (urgency === "soon") {
    return `Reminders for this type start ${leadTimeDays} days ahead, so it is on your radar with ${daysUntil} days to spare.`;
  }
  return `Still ${daysUntil} days away. Reminders start ${leadTimeDays} days before it is due.`;
}

/** Short human phrase for days until / overdue. */
export function formatDaysUntil(daysUntil: number): string {
  if (daysUntil === 0) return "Due today";
  if (daysUntil === 1) return "Due tomorrow";
  if (daysUntil === -1) return "1 day overdue";
  if (daysUntil < 0) return `${Math.abs(daysUntil)} days overdue`;
  return `In ${daysUntil} days`;
}
