"use client";

import { useMemo, useState } from "react";
import {
  buildCalendarMonth,
  findDay,
  formatFullDate,
  monthEntries,
  shiftMonth,
  WEEKDAY_LABELS,
  type CalendarEntry,
} from "@/lib/calendar";
import { explainUrgency, formatDaysUntil } from "@/lib/reminders";
import type { Renewal } from "@/lib/types";
import { RENEWAL_CYCLE_LABELS, RENEWAL_TYPE_LABELS } from "@/lib/types";
import { PanelHeader, PanelShell } from "./PanelShell";
import { URGENCY_BADGE, URGENCY_DOT } from "./urgencyStyles";

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
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  // null means "show the whole month" rather than a single day.
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const calendar = useMemo(
    () => buildCalendarMonth(renewals, cursor.year, cursor.month),
    [renewals, cursor.year, cursor.month],
  );

  const listEntries = selectedDay
    ? (findDay(calendar, selectedDay)?.entries ?? [])
    : monthEntries(calendar);

  const selectedEntry =
    listEntries.find((entry) => entry.renewal.id === selectedId) ?? null;

  function goToMonth(delta: number) {
    setCursor((prev) => shiftMonth(prev.year, prev.month, delta));
    setSelectedDay(null);
    setSelectedId(null);
  }

  function selectDay(iso: string) {
    // Tapping the selected day again returns to the month list.
    setSelectedDay((prev) => (prev === iso ? null : iso));
    setSelectedId(null);
  }

  return (
    <PanelShell label="Renewal calendar" onClose={onClose}>
      {(close) => (
        <>
          <PanelHeader onClose={close}>
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
          </PanelHeader>

          <div className="px-4 py-3">
            <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-medium tracking-wide text-stone-400 uppercase">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendar.weeks.flat().map((day) => {
                const isSelected = day.iso === selectedDay;
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
                            isSelected
                              ? "bg-white/80"
                              : URGENCY_DOT[entry.view.urgency]
                          } ${entry.isProjected ? "opacity-50" : ""}`}
                        />
                      ))}
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
                  close();
                }}
                onMarkDone={onMarkDone}
              />
            ) : (
              <EntryList
                heading={
                  selectedDay ? formatFullDate(selectedDay) : `Due in ${calendar.label}`
                }
                emptyMessage={
                  selectedDay
                    ? "Nothing due on this day."
                    : "Nothing due this month."
                }
                entries={listEntries}
                showDates={!selectedDay}
                onSelect={setSelectedId}
                onClearDay={selectedDay ? () => setSelectedDay(null) : undefined}
              />
            )}
          </div>
        </>
      )}
    </PanelShell>
  );
}

function EntryList({
  heading,
  emptyMessage,
  entries,
  showDates,
  onSelect,
  onClearDay,
}: {
  heading: string;
  emptyMessage: string;
  entries: CalendarEntry[];
  showDates: boolean;
  onSelect: (id: string) => void;
  onClearDay?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-stone-900">{heading}</p>
        {onClearDay ? (
          <button
            type="button"
            onClick={onClearDay}
            className="text-xs text-stone-500 transition hover:text-stone-900"
          >
            Show whole month
          </button>
        ) : (
          entries.length > 0 && (
            <span className="text-xs text-stone-400">
              {entries.length} item{entries.length === 1 ? "" : "s"}
            </span>
          )
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-stone-500">{emptyMessage}</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((entry) => (
            <li key={`${entry.renewal.id}-${entry.iso}`}>
              <button
                type="button"
                onClick={() => onSelect(entry.renewal.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-stone-200 px-3 py-2 text-left transition hover:border-stone-300 hover:bg-stone-50"
              >
                {showDates && (
                  <span className="w-9 shrink-0 text-center">
                    <span className="block text-sm font-semibold text-stone-900">
                      {Number(entry.iso.slice(8, 10))}
                    </span>
                    <span className="block text-[10px] text-stone-400 uppercase">
                      {monthAbbrev(entry.iso)}
                    </span>
                  </span>
                )}
                <span className="min-w-0 flex-1">
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

function monthAbbrev(iso: string): string {
  return new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, 1)
    .toLocaleDateString("en-GB", { month: "short" });
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
        ‹ Back to list
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
            renewal.leadTimeOverrideDays != null
              ? "Custom override"
              : "Type default"
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

      {renewal.notes && <p className="text-sm text-stone-600">{renewal.notes}</p>}

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
