import type { Urgency } from "@/lib/types";

export const URGENCY_DOT: Record<Urgency, string> = {
  overdue: "bg-red-500",
  act_now: "bg-amber-500",
  soon: "bg-sky-500",
  later: "bg-stone-400",
};

export const URGENCY_BADGE: Record<Urgency, string> = {
  overdue: "bg-red-100 text-red-800",
  act_now: "bg-amber-100 text-amber-900",
  soon: "bg-sky-100 text-sky-900",
  later: "bg-stone-100 text-stone-700",
};

export const URGENCY_BORDER: Record<Urgency, string> = {
  overdue: "border-red-200",
  act_now: "border-amber-200",
  soon: "border-sky-200",
  later: "border-stone-200",
};

/** Left accent bar and progress fill. */
export const URGENCY_BAR: Record<Urgency, string> = {
  overdue: "bg-red-500",
  act_now: "bg-amber-500",
  soon: "bg-sky-500",
  later: "bg-stone-300",
};

/** Tinted circle behind the type icon on each card. */
export const URGENCY_CHIP: Record<Urgency, string> = {
  overdue: "bg-red-50 text-red-700 ring-red-100",
  act_now: "bg-amber-50 text-amber-800 ring-amber-100",
  soon: "bg-sky-50 text-sky-800 ring-sky-100",
  later: "bg-stone-50 text-stone-600 ring-stone-200",
};

export const URGENCY_TITLE: Record<Urgency, string> = {
  overdue: "Overdue",
  act_now: "Act now",
  soon: "Coming up",
  later: "Later",
};
