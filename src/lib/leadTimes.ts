import type { RenewalType } from "./types";

/**
 * Default lead times (days before renewal) by type.
 *
 * Rationale: a nudge is only useful if the user still has time to act.
 * Passports/licences need months; subscriptions need a few days.
 * A flat "remind 7 days before everything" is the naive approach we reject.
 */
export const DEFAULT_LEAD_TIME_DAYS: Record<RenewalType, number> = {
  passport: 90,
  licence: 60,
  road_tax: 30,
  insurance: 30,
  subscription: 7,
  other: 14,
};

/**
 * Typical time needed to complete the renewal action.
 * Used to escalate into "act now" when remaining days are too tight.
 */
export const ACTION_WINDOW_DAYS: Record<RenewalType, number> = {
  passport: 21,
  licence: 14,
  road_tax: 7,
  insurance: 7,
  subscription: 2,
  other: 5,
};

export function getDefaultLeadTime(type: RenewalType): number {
  return DEFAULT_LEAD_TIME_DAYS[type];
}

export function getActionWindow(type: RenewalType): number {
  return ACTION_WINDOW_DAYS[type];
}
