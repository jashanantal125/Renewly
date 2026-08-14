"use client";

import { createLocalStore } from "./localStore";
import type { AckMap } from "./notifications";
import type { Renewal } from "./types";

const NO_RENEWALS: Renewal[] = [];
const NO_ACKS: AckMap = {};

const renewalStore = createLocalStore<Renewal[]>(
  "renewly.renewals.v1",
  NO_RENEWALS,
);

/** Acknowledged notifications, so a dismissed nudge stays quiet. */
const ackStore = createLocalStore<AckMap>("renewly.acks.v1", NO_ACKS);

export function useRenewals() {
  return renewalStore.useStore();
}

export function useAcks() {
  return ackStore.useStore();
}
