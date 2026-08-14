"use client";

import { useEffect, useRef } from "react";
import type { Renewal } from "./types";

/**
 * Mirrors the local list to the server while signed in.
 *
 * The browser stays the source of truth — the app must keep working offline and
 * signed out — so this is a one-way push of the whole list whenever it changes.
 * The scheduled reminder job reads that copy, since it cannot read localStorage.
 *
 * Trade-off: last write wins, so two devices editing the same account will
 * overwrite each other rather than merge.
 */
export function useRenewalSync(renewals: Renewal[], enabled: boolean) {
  // Serialised list from the last successful push, to skip no-op requests.
  const lastPushed = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      lastPushed.current = null;
      return;
    }

    const payload = JSON.stringify({ renewals });
    if (payload === lastPushed.current) return;

    const controller = new AbortController();
    // Small delay so a burst of edits results in one request.
    const timer = window.setTimeout(() => {
      void fetch("/api/renewals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: controller.signal,
      })
        .then((response) => {
          if (response.ok) lastPushed.current = payload;
        })
        .catch(() => {
          // Offline or interrupted: the next change retries.
        });
    }, 600);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [renewals, enabled]);
}
