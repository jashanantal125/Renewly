"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildCalendarMonth,
  findDay,
  formatFullDate,
  shiftMonth,
  WEEKDAY_LABELS,
  type CalendarEntry,
} from "@/lib/calendar";
import { explainUrgency, formatDaysUntil } from "@/lib/reminders";
import { todayIso } from "@/lib/dates";
import type { Renewal, Urgency } from "@/lib/types";
import { RENEWAL_CYCLE_LABELS, RENEWAL_TYPE_LABELS } from "@/lib/types";

const URGENCY_DOT: Record<Urgency, string> = {
  overdue: "bg-red-500",
  act_now: "bg-amber-500",
  soon: "bg-sky-500",
  later: "bg-stone-400",
};

const URGENCY_BADGE: Record<Urgency, string> = {
  overdue: "bg-red-100 text-red-800",
  act_now: "bg-amber-100 text-amber-900",
  soon: "bg-sky-100 text-sky-900",
  later: "bg-stone-100 text-stone-700",
};

/** Animation length must match the CSS keyframes in globals.css. */
const CLOSE_ANIMATION_MS = 160;

export function CalendarPanel({
  renewals,
  onClose,
  onEdit,
  onMarkDone,
}: {
  renewals: Renewal[];
  onClose: () => void;
  onEdit: (renewal: Renewal) => void;
  onMarkDone: (renewal: Renewal) => void;
}) {
  const today = todayIso();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(today);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const calendar = useMemo(
    () => buildCalendarMonth(renewals, cursor.year, cursor.month),
    [renewals, cursor.year, cursor.month],
  );

  const dayEntries = selectedDay
    ? (findDay(calendar, selectedDay)?.entries ?? [])
    : [];
  const selectedEntry =
    dayEntries.find((entry) => entry.renewal.id === selectedId) ?? null;

  // Let the exit animation finish before unmounting.
  const requestClose = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, CLOSE_ANIMATION_MS);
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  function goToMonth(delta: number) {
    setCursor((prev) => shiftMonth(prev.year, prev.month, delta));
    setSelectedId(null);
  }

  function selectDay(iso: string) {
    setSelectedDay(iso);
    setSelectedId(null);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center px-4 py-6 sm:justify-end sm:px-6 ${
        closing ? "animate-overlay-out" : "animate-overlay-in"
      } bg-stone-900/20 backdrop-blur-sm`}
      onClick={requestClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Renewal calendar"
        onClick={(event) => event.stopPropagation()}
        className={`h-fit max-h-full w-full max-w-md origin-top overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-xl sm:origin-top-right ${
          closing ? "animate-panel-out" : "animate-panel-in"
        }`}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => goToMonth(-1)}
              className="rounded-md px-2 py-1 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
            >
              ‹
            </button>
            <p className="min-w-36 text-center text-sm font-semibold text-stone-900">
              {calendar.label}
            </p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => goToMonth(1)}
              className="rounded-md px-2 py-1 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
            >
              ›
            </button>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-md px-2 py-1 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
          >
            Close
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-medium tracking-wide text-stone-400 uppercase">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendar.weeks.flat().map((day) => {
              const isSelected = day.iso === selectedDay;
              const topUrgency = day.entries[0]?.view.urgency;
              return (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => selectDay(day.iso)}
                  aria-label={`${formatFullDate(day.iso)}, ${day.entries.length} renewals`}
                  className={`flex h-11 flex-col items-center justify-center gap-1 rounded-lg text-sm transition ${
                    isSelected
                      ? "bg-emerald-800 text-white"
                      : day.inCurrentMonth
                        ? "text-stone-800 hover:bg-stone-100"
                        : "text-stone-300 hover:bg-stone-50"
                  } ${day.isToday && !isSelected ? "ring-1 ring-emerald-700" : ""}`}
                >
                  <span className={day.isToday ? "font-semibold" : undefined}>
                    {day.dayOfMonth}
                  </span>
                  <span className="flex h-1.5 items-center gap-0.5">
                    {day.entries.slice(0, 3).map((entry) => (
                      <span
                        key={`${entry.renewal.id}-${entry.iso}`}
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? "bg-white/80" : URGENCY_DOT[entry.view.urgency]
                        } ${entry.isProjected ? "opacity-50" : ""}`}
                      />
                    ))}
                    {day.entries.length > 3 && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? "bg-white/80" : URGENCY_DOT[topUrgency ?? "later"]
                        }`}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-stone-200 px-4 py-3">
          {selectedEntry ? (
            <EntryDetail
              entry={selectedEntry}
              onBack={() => setSelectedId(null)}
              onEdit={(renewal) => {
                onEdit(renewal);
                requestClose();
              }}
              onMarkDone={onMarkDone}
            />
          ) : (
            <DayList
              iso={selectedDay}
              entries={dayEntries}
              onSelect={setSelectedId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DayList({
  iso,
  entries,
  onSelect,
}: {
  iso: string | null;
  entries: CalendarEntry[];
  onSelect: (id: string) => void;
}) {
  if (!iso) {
    return <p className="text-sm text-stone-500">Pick a day to see what is due.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-stone-900">{formatFullDate(iso)}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-stone-500">Nothing due on this day.</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((entry) => (
            <li key={`${entry.renewal.id}-${entry.iso}`}>
              <button
                type="button"
                onClick={() => onSelect(entry.renewal.id)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2 text-left transition hover:border-stone-300 hover:bg-stone-50"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        URGENCY_DOT[entry.view.urgency]
                      }`}
                    />
                    <span className="truncate text-sm font-medium text-stone-900">
                      {entry.renewal.name}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-stone-500">
                    {RENEWAL_TYPE_LABELS[entry.renewal.type]}
                    {entry.isProjected ? " · projected cycle" : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-stone-400">Details ›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryDetail({
  entry,
  onBack,
  onEdit,
  onMarkDone,
}: {
  entry: CalendarEntry;
  onBack: () => void;
  onEdit: (renewal: Renewal) => void;
  onMarkDone: (renewal: Renewal) => void;
}) {
  const { renewal, view, isProjected } = entry;

  return (
    <div className="animate-detail-in space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-stone-500 transition hover:text-stone-900"
      >
        ‹ Back to day
      </button>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-stone-900">{renewal.name}</p>
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
              URGENCY_BADGE[view.urgency]
            }`}
          >
            {view.urgencyLabel}
          </span>
        </div>
        <p className="text-sm text-stone-500">
          {RENEWAL_TYPE_LABELS[renewal.type]} ·{" "}
          {RENEWAL_CYCLE_LABELS[renewal.cycle]}
          {renewal.cycle === "custom" && renewal.customCycleDays
            ? ` (${renewal.customCycleDays}d)`
            : ""}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Detail label="Next due" value={formatFullDate(renewal.renewalDate)} />
        <Detail label="Status" value={formatDaysUntil(view.daysUntil)} />
        <Detail label="Lead time" value={`${view.leadTimeDays} days`} />
        <Detail
          label="Reminder starts"
          value={
            renewal.leadTimeOverrideDays != null ? "Custom override" : "Type default"
          }
        />
      </dl>

      <p className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
        {explainUrgency(view)}
      </p>

      {isProjected && (
        <p className="text-xs text-stone-500">
          This date is a projected future cycle. Urgency is measured from the
          next real due date ({formatFullDate(renewal.renewalDate)}).
        </p>
      )}

      {renewal.notes && (
        <p className="text-sm text-stone-600">{renewal.notes}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {renewal.cycle !== "once" && (
          <button
            type="button"
            onClick={() => onMarkDone(renewal)}
            className="rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-900"
          >
            Mark renewed
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(renewal)}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-400 uppercase">{label}</dt>
      <dd className="text-stone-800">{value}</dd>
    </div>
  );
}
