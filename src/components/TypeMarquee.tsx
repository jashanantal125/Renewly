"use client";

import type { RenewalType } from "@/lib/types";
import { RENEWAL_TYPE_LABELS } from "@/lib/types";
import { TypeIcon } from "./TypeIcon";

/** Longest lead first, ending on subscriptions, the shortest. */
const ORDER: RenewalType[] = [
  "passport",
  "licence",
  "road_tax",
  "insurance",
  "other",
  "subscription",
];

/**
 * Sliding row of what Renewly can track, introduced by a label and arrow so it
 * reads as an invitation ("set reminders for these") rather than a spec sheet.
 * Each type's lead time is shown where it is actionable instead: in the form
 * while choosing a type, and on each card once saved.
 */
export function TypeMarquee() {
  // Rendered twice so the -50% shift loops without a visible seam.
  const track = [...ORDER, ...ORDER];

  return (
    <div className="flex items-center gap-2.5 sm:gap-3.5">
      <p className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-stone-700 sm:text-base">
        Set reminders for
        <ArrowIcon />
      </p>

      <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <ul
          aria-label="Renewal types you can track"
          className="animate-marquee flex w-max hover:[animation-play-state:paused]"
        >
          {track.map((type, index) => (
            <li
              key={`${type}-${index}`}
              aria-hidden={index >= ORDER.length}
              className="mr-2 flex shrink-0 items-center gap-2 rounded-full border border-emerald-900/10 bg-white/70 py-1.5 pr-3.5 pl-2 shadow-sm"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-800/10 text-emerald-900">
                <TypeIcon type={type} className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-medium whitespace-nowrap text-stone-700">
                {RENEWAL_TYPE_LABELS[type]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-nudge-x h-5 w-5 shrink-0 text-emerald-800 sm:h-6 sm:w-6"
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}
