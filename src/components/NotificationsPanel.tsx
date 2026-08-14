"use client";

import { explainUrgency, formatDaysUntil } from "@/lib/reminders";
import type { ReminderView, Renewal } from "@/lib/types";
import { RENEWAL_TYPE_LABELS } from "@/lib/types";
import { PanelHeader, PanelShell } from "./PanelShell";
import { URGENCY_BADGE, URGENCY_BORDER, URGENCY_DOT } from "./urgencyStyles";

export function NotificationsPanel({
  notifications,
  silencedCount,
  onClose,
  onDismiss,
  onDismissAll,
  onMarkDone,
}: {
  notifications: ReminderView[];
  silencedCount: number;
  onClose: () => void;
  onDismiss: (view: ReminderView) => void;
  onDismissAll: () => void;
  onMarkDone: (renewal: Renewal) => void;
}) {
  return (
    <PanelShell label="Notifications" onClose={onClose}>
      {(close) => (
        <>
          <PanelHeader onClose={close}>
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-semibold text-stone-900">Notifications</p>
              {notifications.length > 0 && (
                <span className="text-xs text-stone-400">
                  {notifications.length} active
                </span>
              )}
            </div>
          </PanelHeader>

          <div className="space-y-3 px-4 py-3">
            {notifications.length === 0 ? (
              <div className="space-y-1 py-4">
                <p className="text-sm font-medium text-stone-800">
                  You are all caught up.
                </p>
                <p className="text-sm text-stone-500">
                  Nothing is inside its reminder window right now. Items appear
                  here once they are close enough that you can act on them.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-stone-500">
                    One nudge per renewal, only once it is close enough to act on.
                  </p>
                  <button
                    type="button"
                    onClick={onDismissAll}
                    className="shrink-0 text-xs font-medium text-emerald-800 transition hover:text-emerald-900"
                  >
                    Dismiss all
                  </button>
                </div>

                <ul className="space-y-2">
                  {notifications.map((view) => (
                    <li
                      key={view.renewal.id}
                      className={`animate-detail-in space-y-2 rounded-lg border bg-white px-3 py-2.5 ${
                        URGENCY_BORDER[view.urgency]
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            URGENCY_DOT[view.urgency]
                          }`}
                        />
                        <p className="text-sm font-medium text-stone-900">
                          {view.renewal.name}
                        </p>
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                            URGENCY_BADGE[view.urgency]
                          }`}
                        >
                          {formatDaysUntil(view.daysUntil)}
                        </span>
                      </div>

                      <p className="text-sm text-stone-600">
                        {explainUrgency(view)}
                      </p>

                      <p className="text-xs text-stone-400">
                        {RENEWAL_TYPE_LABELS[view.renewal.type]} ·{" "}
                        {view.renewal.renewalDate}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {view.renewal.cycle !== "once" && (
                          <button
                            type="button"
                            onClick={() => onMarkDone(view.renewal)}
                            className="rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-900"
                          >
                            Mark renewed
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDismiss(view)}
                          className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {silencedCount > 0 && (
              <p className="border-t border-stone-100 pt-3 text-xs text-stone-500">
                {silencedCount} dismissed nudge{silencedCount === 1 ? "" : "s"}{" "}
                hidden. They return if the item gets more urgent or moves to its
                next cycle.
              </p>
            )}
          </div>
        </>
      )}
    </PanelShell>
  );
}
