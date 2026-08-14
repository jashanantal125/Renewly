"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * Explains a failed sign-in.
 *
 * The OAuth callback cannot render UI, so it redirects to `/?auth_error=reason`
 * and this turns the reason into something a person can act on. Without it a
 * failed sign-in would silently return the user to an unchanged page.
 */
const MESSAGES: Record<string, string> = {
  denied: "Sign-in was cancelled, so no reminders will be emailed.",
  bad_state:
    "That sign-in link expired or did not come from here. Please try again.",
  token_exchange_failed:
    "Google rejected the sign-in. Check the app's OAuth credentials.",
  no_profile: "Google did not return an email address for that account.",
  email_unverified:
    "That Google account has an unverified email, so reminders cannot be sent to it.",
  not_configured: "Email reminders are not configured on this deployment.",
  storage_failed:
    "Signed in with Google, but your account could not be saved. Please try again shortly.",
};

export function AuthErrorNotice() {
  const params = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  const reason = params.get("auth_error");
  if (!reason || dismissed) return null;

  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p>{MESSAGES[reason] ?? "Sign-in did not complete. Please try again."}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 rounded-md px-1.5 text-amber-700 transition hover:bg-amber-100"
      >
        ×
      </button>
    </div>
  );
}
