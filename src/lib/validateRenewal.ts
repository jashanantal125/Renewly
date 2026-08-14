import type { Renewal, RenewalCycle, RenewalType } from "./types";
import { RENEWAL_CYCLE_LABELS, RENEWAL_TYPE_LABELS } from "./types";

const TYPES = new Set(Object.keys(RENEWAL_TYPE_LABELS));
const CYCLES = new Set(Object.keys(RENEWAL_CYCLE_LABELS));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Guard against a client posting junk we would later feed to the date parser. */
export function parseRenewal(value: unknown): Renewal | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;

  if (typeof raw.id !== "string" || raw.id === "") return null;
  if (typeof raw.name !== "string" || raw.name.trim() === "") return null;
  if (typeof raw.type !== "string" || !TYPES.has(raw.type)) return null;
  if (typeof raw.cycle !== "string" || !CYCLES.has(raw.cycle)) return null;
  if (typeof raw.renewalDate !== "string" || !ISO_DATE.test(raw.renewalDate)) {
    return null;
  }
  if (Number.isNaN(Date.parse(raw.renewalDate))) return null;

  const renewal: Renewal = {
    id: raw.id,
    name: raw.name.slice(0, 120),
    type: raw.type as RenewalType,
    cycle: raw.cycle as RenewalCycle,
    renewalDate: raw.renewalDate,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };

  if (typeof raw.customCycleDays === "number" && raw.customCycleDays > 0) {
    renewal.customCycleDays = Math.floor(raw.customCycleDays);
  }
  if (typeof raw.leadTimeOverrideDays === "number" && raw.leadTimeOverrideDays >= 0) {
    renewal.leadTimeOverrideDays = Math.floor(raw.leadTimeOverrideDays);
  }
  if (typeof raw.notes === "string" && raw.notes.trim() !== "") {
    renewal.notes = raw.notes.slice(0, 500);
  }

  return renewal;
}

/** Cap the stored list so one client cannot fill the database. */
export const MAX_SYNCED_RENEWALS = 200;

export function parseRenewalList(value: unknown): Renewal[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_SYNCED_RENEWALS) return null;

  const parsed: Renewal[] = [];
  for (const item of value) {
    const renewal = parseRenewal(item);
    if (!renewal) return null;
    parsed.push(renewal);
  }
  return parsed;
}
