"use client";

import {
  formatDaysUntil,
  formatShortDate,
  formatWindowCaption,
  nudgeProgress,
} from "@/lib/reminders";
import type { ReminderView, Renewal, Urgency } from "@/lib/types";
import {
  RENEWAL_CYCLE_LABELS,
  RENEWAL_TYPE_LABELS,
  URGENCY_ORDER,
} from "@/lib/types";
import { TypeIcon } from "./TypeIcon";
import {
  URGENCY_BADGE,
  URGENCY_BAR,
  URGENCY_CHIP,
  URGENCY_DOT,
  URGENCY_TITLE,
} from "./urgencyStyles";

interface Section {
  urgency: Urgency;
  items: ReminderView[];
  /** Position of this section's first card in the overall list. */
  offset: number;
}

/**
 * Non-empty urgency groups in display order, each tagged with how many cards
 * precede it so the entry animation staggers continuously down the page.
 */
function buildSections(grouped: Record<Urgency, ReminderView[]>): Section[] {
  return URGENCY_ORDER.filter((urgency) => grouped[urgency].length > 0).reduce<
    Section[]
  >((sections, urgency) => {
    const previous = sections.at(-1);
    const offset = previous ? previous.offset + previous.items.length : 0;
    return [...sections, { urgency, items: grouped[urgency], offset }];
  }, []);
}

export function RenewalList({
  grouped,
  onEdit,
  onDone,
  onDelete,
}: {
  grouped: Record<Urgency, ReminderView[]>;
  onEdit: (renewal: Renewal) => void;
  onDone: (renewal: Renewal) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-7">
      {buildSections(grouped).map(({ urgency, items, offset }) => {
        return (
          <section key={urgency} className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span
                className={`h-2 w-2 rounded-full ${URGENCY_DOT[urgency]}`}
                aria-hidden="true"
              />
              <h3 className="text-xs font-semibold tracking-[0.14em] text-stone-600 uppercase">
                {URGENCY_TITLE[urgency]}
              </h3>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-stone-500 ring-1 ring-stone-200">
                {items.length}
              </span>
              <span className="h-px flex-1 bg-stone-200" aria-hidden="true" />
            </div>

            <ul className="space-y-2.5">
              {items.map((item, itemIndex) => (
                <RenewalCard
                  key={item.renewal.id}
                  view={item}
                  index={offset + itemIndex}
                  onEdit={onEdit}
                  onDone={onDone}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function RenewalCard({
  view,
  index,
  onEdit,
  onDone,
  onDelete,
}: {
  view: ReminderView;
  index: number;
  onEdit: (renewal: Renewal) => void;
  onDone: (renewal: Renewal) => void;
  onDelete: (id: string) => void;
}) {
  const { renewal, urgency } = view;
  const progress = Math.round(nudgeProgress(view) * 100);

  return (
    <li
      className="animate-card-in group relative overflow-hidden rounded-xl border border-stone-200/90 bg-white/85 shadow-sm backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${URGENCY_BAR[urgency]}`}
      />

      <div className="flex gap-3 py-3.5 pr-3.5 pl-5 sm:gap-4">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1 ${URGENCY_CHIP[urgency]}`}
        >
          <TypeIcon type={renewal.type} className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="truncate font-medium text-stone-900">
                {renewal.name}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                {RENEWAL_TYPE_LABELS[renewal.type]} ·{" "}
                {formatShortDate(renewal.renewalDate)} ·{" "}
                {RENEWAL_CYCLE_LABELS[renewal.cycle]}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${URGENCY_BADGE[urgency]}`}
            >
              {formatDaysUntil(view.daysUntil)}
            </span>
          </div>

          <div className="space-y-1">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-stone-100"
              role="img"
              aria-label={`${progress}% through its ${view.leadTimeDays}-day reminder window`}
            >
              <span
                className={`animate-bar-grow block h-full origin-left rounded-full ${URGENCY_BAR[urgency]}`}
                style={{
                  width: `${progress}%`,
                  animationDelay: `${Math.min(index, 8) * 45 + 120}ms`,
                }}
              />
            </div>
            <p className="text-xs text-stone-500">
              {formatWindowCaption(view)}
              <span className="text-stone-400">
                {" "}
                · {view.leadTimeDays}d lead
              </span>
            </p>
          </div>

          {renewal.notes && (
            <p className="text-sm text-stone-600">{renewal.notes}</p>
          )}

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <CardAction onClick={() => onDone(renewal)} tone="primary">
              {renewal.cycle === "once" ? "Mark done" : "Renewed"}
            </CardAction>
            <CardAction onClick={() => onEdit(renewal)}>Edit</CardAction>
            <CardAction onClick={() => onDelete(renewal.id)} tone="danger">
              Delete
            </CardAction>
          </div>
        </div>
      </div>
    </li>
  );
}

function CardAction({
  children,
  onClick,
  tone = "neutral",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "primary" | "neutral" | "danger";
}) {
  const tones = {
    primary:
      "border-emerald-800/20 bg-emerald-50/60 text-emerald-900 hover:bg-emerald-100",
    neutral: "border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
    danger: "border-stone-200 bg-white text-red-700 hover:bg-red-50",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
