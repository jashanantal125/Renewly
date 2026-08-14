"use client";

import { useSyncExternalStore } from "react";
import { loadJson, saveJson } from "./storage";

type Updater<T> = T | ((prev: T) => T);

/**
 * Tiny localStorage-backed store shared by React components.
 *
 * useSyncExternalStore keeps every consumer in sync without a context
 * provider, and avoids the setState-in-effect hydration pitfall.
 * `empty` must be a stable reference: React re-renders forever if the
 * server snapshot is a new object each call.
 */
export function createLocalStore<T>(key: string, empty: T) {
  let memory: T | null = null;
  const listeners = new Set<() => void>();

  function read(): T {
    if (memory === null) {
      memory = loadJson<T>(key, empty);
    }
    return memory;
  }

  function write(next: T): void {
    memory = next;
    saveJson(key, next);
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getServerSnapshot(): T {
    return empty;
  }

  function useStore() {
    const value = useSyncExternalStore(subscribe, read, getServerSnapshot);

    function setValue(updater: Updater<T>) {
      const prev = read();
      const next =
        typeof updater === "function"
          ? (updater as (prev: T) => T)(prev)
          : updater;
      write(next);
    }

    return [value, setValue] as const;
  }

  return { read, write, useStore };
}
