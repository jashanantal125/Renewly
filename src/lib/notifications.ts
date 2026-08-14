import type { ReminderView, Urgency } from "./types";
import { URGENCY_ORDER } from "./types";

/**
 * What the user dismissed, captured precisely enough that we know when the
 * situation has changed and the nudge deserves to come back.
 */
export interface Acknowledgement {
  /** The due date that was showing when it was dismissed. */
  renewalDate: string;
  /** The urgency that was showing when it was dismissed. */
  urgency: Urgency;
}

export type AckMap = Record<string, Acknowledgement>;

function urgencyRank(urgency: Urgency): number {
  // URGENCY_ORDER runs most-urgent first, so a lower index means more urgent.
  return URGENCY_ORDER.indexOf(urgency);
}

/**
 * A dismissal is only honoured while nothing has changed.
 *
 * It stops applying when the item moves to a new cycle (a different due date)
 * or when it escalates, e.g. "coming up" becoming "act now". Otherwise
 * dismissing once would silence an item right up to the day it lapses.
 */
export function isAcknowledged(
  view: ReminderView,
  ack: Acknowledgement | undefined,
): boolean {
  if (!ack) return false;
  if (ack.renewalDate !== view.renewal.renewalDate) return false;
  return urgencyRank(view.urgency) >= urgencyRank(ack.urgency);
}

/**
 * Notifications are the digest minus the noise: only items inside their
 * lead-time window, and only those the user has not already dismissed.
 * One entry per renewal, never one per day.
 */
export function buildNotifications(
  views: ReminderView[],
  acks: AckMap,
): ReminderView[] {
  return views.filter(
    (view) => view.shouldNudge && !isAcknowledged(view, acks[view.renewal.id]),
  );
}

export function acknowledge(acks: AckMap, view: ReminderView): AckMap {
  return {
    ...acks,
    [view.renewal.id]: {
      renewalDate: view.renewal.renewalDate,
      urgency: view.urgency,
    },
  };
}

export function acknowledgeAll(acks: AckMap, views: ReminderView[]): AckMap {
  return views.reduce((next, view) => acknowledge(next, view), acks);
}

/** Drop acknowledgements for renewals that no longer exist. */
export function pruneAcks(acks: AckMap, keepIds: string[]): AckMap {
  const keep = new Set(keepIds);
  const next: AckMap = {};
  for (const [id, ack] of Object.entries(acks)) {
    if (keep.has(id)) next[id] = ack;
  }
  return next;
}
