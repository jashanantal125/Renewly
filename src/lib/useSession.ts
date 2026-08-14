"use client";

import { useCallback, useEffect, useState } from "react";

export interface SessionUser {
  email: string;
  name: string | null;
  picture: string | null;
  emailRemindersEnabled: boolean;
  lastEmailedAt: string | null;
}

export interface SessionState {
  /** False when the deployment has no OAuth credentials; the UI hides sign-in. */
  configured: boolean;
  mailConfigured: boolean;
  user: SessionUser | null;
  loading: boolean;
}

const INITIAL: SessionState = {
  configured: false,
  mailConfigured: false,
  user: null,
  loading: true,
};

/**
 * Reads the session from `/api/me`.
 *
 * Fetched from the client rather than passed down from a server component so the
 * page itself stays static and instantly interactive; the account UI just
 * appears a moment later.
 */
export function useSession() {
  const [state, setState] = useState<SessionState>(INITIAL);
  // Bumped to ask the effect below for a fresh read.
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/me", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load session");
        return response.json() as Promise<Omit<SessionState, "loading">>;
      })
      .then((data) => setState({ ...data, loading: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Could not load session", error);
        setState({ ...INITIAL, loading: false });
      });

    return () => controller.abort();
  }, [reloadToken]);

  const setEmailReminders = useCallback(
    async (enabled: boolean) => {
      // Optimistic: the toggle should feel instant, and refresh corrects it.
      setState((prev) =>
        prev.user
          ? { ...prev, user: { ...prev.user, emailRemindersEnabled: enabled } }
          : prev,
      );
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailRemindersEnabled: enabled }),
      });
      refresh();
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setState((prev) => ({ ...prev, user: null }));
  }, []);

  return { ...state, refresh, setEmailReminders, signOut };
}
