import type { Renewal, RenewalCycle, RenewalType } from "./types";
import { createId } from "./storage";

export interface RenewalInput {
  name: string;
  type: RenewalType;
  renewalDate: string;
  cycle: RenewalCycle;
  customCycleDays?: number;
  leadTimeOverrideDays?: number;
  notes?: string;
}

export function createRenewal(input: RenewalInput, now: Date = new Date()): Renewal {
  const stamp = now.toISOString();
  return {
    id: createId(),
    name: input.name.trim(),
    type: input.type,
    renewalDate: input.renewalDate,
    cycle: input.cycle,
    customCycleDays:
      input.cycle === "custom" ? input.customCycleDays : undefined,
    leadTimeOverrideDays: input.leadTimeOverrideDays,
    notes: input.notes?.trim() || undefined,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function updateRenewal(
  existing: Renewal,
  input: RenewalInput,
  now: Date = new Date(),
): Renewal {
  return {
    ...existing,
    name: input.name.trim(),
    type: input.type,
    renewalDate: input.renewalDate,
    cycle: input.cycle,
    customCycleDays:
      input.cycle === "custom" ? input.customCycleDays : undefined,
    leadTimeOverrideDays: input.leadTimeOverrideDays,
    notes: input.notes?.trim() || undefined,
    updatedAt: now.toISOString(),
  };
}
