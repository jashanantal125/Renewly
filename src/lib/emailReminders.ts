import { acknowledgeAll, buildNotifications, type AckMap } from "./notifications";
import { buildReminderDigest } from "./reminders";
import type { ReminderView, Renewal } from "./types";

export interface EmailPlan {
  /** Items that deserve an email right now. */
  views: ReminderView[];
  /** Record to store after a successful send, so the next run stays quiet. */
  nextEmailedNudges: AckMap;
}

/**
 * Decide what to email, reusing the in-app notification rules.
 *
 * The scheduled job runs daily, so the interesting question is not "what is due"
 * but "what have we not already said". `buildNotifications` already answers that
 * for the bell: it drops anything outside its lead-time window and anything
 * previously acknowledged, and it lets an item back through when it escalates or
 * rolls into a new cycle. Passing the *emailed* record in place of the user's
 * dismissals gives email the same behaviour for free — one email per renewal per
 * urgency step, instead of the same message every morning.
 */
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
