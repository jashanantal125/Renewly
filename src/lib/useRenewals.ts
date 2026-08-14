"use client";

import { useSyncExternalStore } from "react";
import type { Renewal } from "./types";
import { loadRenewals, saveRenewals } from "./storage";

let memory: Renewal[] | null = null;
const listeners = new Set<() => void>();

function read(): Renewal[] {
  if (memory === null) {
    memory = loadRenewals();
  }
  return memory;
}

function write(next: Renewal[]) {
  memory = next;
  saveRenewals(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Must be a stable reference: a fresh array each call makes React re-render forever.
const EMPTY: Renewal[] = [];

function getServerSnapshot(): Renewal[] {
  return EMPTY;
}

/**
 * Persist renewals in localStorage and keep React in sync.
 * useSyncExternalStore avoids the hydration / setState-in-effect pitfalls.
 */
export function useRenewals() {
  const renewals = useSyncExternalStore(subscribe, read, getServerSnapshot);

  function setRenewals(updater: Renewal[] | ((prev: Renewal[]) => Renewal[])) {
    const prev = read();
    const next = typeof updater === "function" ? updater(prev) : updater;
    write(next);
  }

  return [renewals, setRenewals] as const;
}
