/**
 * Core domain types for Renewly.
 *
 * Design goal: model renewals so we can decide *when* to nudge,
 * not just sort by date.
 */

export type RenewalType =
  | "passport"
  | "licence"
  | "road_tax"
  | "insurance"
  | "subscription"
  | "other";

export type RenewalCycle = "once" | "monthly" | "yearly" | "custom";

export type Urgency = "overdue" | "act_now" | "soon" | "later";

export interface Renewal {
  id: string;
  name: string;
  type: RenewalType;
  /** ISO date string YYYY-MM-DD (local calendar date). */
  renewalDate: string;
  cycle: RenewalCycle;
  /** Used when cycle === "custom". */
  customCycleDays?: number;
  /** Optional override of the type-based default lead time. */
  leadTimeOverrideDays?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderView {
  renewal: Renewal;
  /** Signed day difference: negative = already overdue. */
  daysUntil: number;
  /** Effective lead time used for this item (override or type default). */
  leadTimeDays: number;
  urgency: Urgency;
  /** Human label for the urgency bucket. */
  urgencyLabel: string;
  /** True when today is inside the lead-time window (or overdue). */
  shouldNudge: boolean;
}

export const RENEWAL_TYPE_LABELS: Record<RenewalType, string> = {
  passport: "Passport",
  licence: "Licence",
  road_tax: "Road tax",
  insurance: "Insurance",
  subscription: "Subscription",
  other: "Other",
};

export const RENEWAL_CYCLE_LABELS: Record<RenewalCycle, string> = {
  once: "One-time",
  monthly: "Monthly",
  yearly: "Yearly",
  custom: "Custom",
};

export const URGENCY_ORDER: Urgency[] = [
  "overdue",
  "act_now",
  "soon",
  "later",
];
