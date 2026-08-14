"use client";

import { GoogleMark } from "./GoogleMark";

/**
 * The sign-in call to action.
 *
 * Placed directly under the summary because that is where the user has just
 * seen how many renewals are coming up — the moment the offer to be emailed
 * makes sense. It is a link, not a button with a click handler, so the browser
 * performs a normal navigation to the OAuth route.
 */
export function GmailCta({ pendingCount }: { pendingCount: number }) {
  const subtitle =
    pendingCount > 0
      ? `${pendingCount} renewal${pendingCount === 1 ? "" : "s"} would be in your inbox right now`
      : "One email per nudge, only when something needs doing";

  return (
    <div className="group relative">
      {/*
       * Two layers make the glow: a soft blurred halo that bleeds outward, and a
       * rotating conic gradient clipped to the button's shape, which reads as
       * light travelling around the edge. The rotating square has to be clipped
       * or its corners would sweep into view.
       */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 rounded-2xl bg-[conic-gradient(from_0deg,#ea4335,#fbbc05,#34a853,#4285f4,#ea4335)] opacity-45 blur-lg transition-opacity duration-300 group-hover:opacity-80"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[2.5px] overflow-hidden rounded-[18px]"
      >
        <span className="absolute top-1/2 left-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 animate-glow-spin bg-[conic-gradient(from_0deg,#ea4335,#fbbc05,#34a853,#4285f4,#ea4335)] opacity-90 blur-[3px] transition-opacity duration-300 group-hover:opacity-100" />
      </span>

      <a
        href="/api/auth/google"
        className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-stone-950 px-4 py-3.5 text-left shadow-[0_10px_30px_-12px_rgba(16,185,129,0.55)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(66,133,244,0.6)] sm:px-5"
      >
        {/* Light sweeping across the face, purely decorative. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />

        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-inner">
          <GoogleMark />
        </span>

        <span className="relative min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white sm:text-base">
            Get these reminders in your Gmail
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-400">
            {subtitle}
          </span>
        </span>

        <span
          aria-hidden="true"
          className="relative hidden shrink-0 animate-nudge-x text-lg text-white/70 sm:block"
        >
          →
        </span>
      </a>
    </div>
  );
}
