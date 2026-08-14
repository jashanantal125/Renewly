"use client";

import { DEFAULT_LEAD_TIME_DAYS } from "@/lib/leadTimes";
import type { RenewalType } from "@/lib/types";
import { RENEWAL_TYPE_LABELS } from "@/lib/types";
import { TypeIcon } from "./TypeIcon";

/** Longest lead first, so the contrast with subscriptions reads immediately. */
const ORDER: RenewalType[] = [
  "passport",
  "licence",
  "road_tax",
  "insurance",
  "other",
  "subscription",
];

/**
 * Sliding row of what Renewly tracks, each pill showing that type's lead time.
 *
 * It carries the lead-time table that used to sit in a footnote: seeing
 * "Passport 90 days" next to "Subscription 7 days" makes the point that a
 * single reminder rule cannot serve both.
 */
export function TypeMarquee() {
  // Rendered twice so the -50% shift loops without a visible seam.
  const track = [...ORDER, ...ORDER];

  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <ul className="animate-marquee flex w-max hover:[animation-play-state:paused]">
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
            <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap text-stone-500">
              {DEFAULT_LEAD_TIME_DAYS[type]}d lead
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
