"use client";

import { useMemo, useRef, useState } from "react";
import {
  buildReminderDigest,
  describeReminderStart,
  groupByUrgency,
  markRenewalDone,
  summarizeDigest,
  type ReminderSummary,
} from "@/lib/reminders";
import {
  acknowledge,
  acknowledgeAll,
  buildNotifications,
  pruneAcks,
} from "@/lib/notifications";
import { createRenewal, updateRenewal, type RenewalInput } from "@/lib/renewals";
import { useAcks, useRenewals } from "@/lib/useRenewals";
import { CalendarPanel } from "@/components/CalendarPanel";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { RenewalFormModal } from "@/components/RenewalFormModal";
import { RenewalList } from "@/components/RenewalList";
import { Toast, type ToastMessage } from "@/components/Toast";
import { TypeMarquee } from "@/components/TypeMarquee";
import type { Renewal } from "@/lib/types";

const TOAST_DURATION_MS = 6000;

/** null = closed, otherwise new (no renewal) or editing an existing one. */
type FormTarget = { renewal?: Renewal } | null;

export default function Home() {
  const [renewals, setRenewals] = useRenewals();
  const [acks, setAcks] = useAcks();
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimer = useRef<number | null>(null);

  const digest = useMemo(() => buildReminderDigest(renewals), [renewals]);
  const grouped = useMemo(() => groupByUrgency(digest), [digest]);
  const summary = useMemo(() => summarizeDigest(digest), [digest]);
  const notifications = useMemo(
    () => buildNotifications(digest, acks),
    [digest, acks],
  );
  const silencedCount =
    digest.filter((view) => view.shouldNudge).length - notifications.length;

  function showToast(title: string, body: string) {
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
    setToast({ key: Date.now(), title, body });
    toastTimer.current = window.setTimeout(
      () => setToast(null),
      TOAST_DURATION_MS,
    );
  }

  function handleSave(input: RenewalInput) {
    const editing = formTarget?.renewal;

    if (editing) {
      const updated = updateRenewal(editing, input);
      setRenewals(renewals.map((r) => (r.id === editing.id ? updated : r)));
      showToast(`${updated.name} updated`, describeReminderStart(updated));
    } else {
      const created = createRenewal(input);
      setRenewals([...renewals, created]);
      showToast(`${created.name} saved`, describeReminderStart(created));
    }

    setFormTarget(null);
  }

  function removeRenewal(id: string) {
    const remaining = renewals.filter((r) => r.id !== id);
    setRenewals(remaining);
    setAcks((prev) =>
      pruneAcks(
        prev,
        remaining.map((r) => r.id),
      ),
    );
  }

  function handleMarkDone(renewal: Renewal) {
    if (renewal.cycle === "once") {
      removeRenewal(renewal.id);
      showToast(
        `${renewal.name} cleared`,
        "One-time renewals are removed once done.",
      );
      return;
    }
    const advanced = markRenewalDone(renewal);
    setRenewals(renewals.map((r) => (r.id === renewal.id ? advanced : r)));
    showToast(`${advanced.name} renewed`, describeReminderStart(advanced));
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-9 px-5 py-10 sm:px-8 sm:py-14">
      <header className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-medium tracking-[0.2em] text-emerald-800/80 uppercase">
            Renewly
          </p>
          <div className="flex items-center gap-2">
            <HeaderButton
              label="Notifications"
              onClick={() => setShowNotifications(true)}
              badge={notifications.length}
              icon={<BellIcon />}
            />
            <HeaderButton
              label="Calendar"
              onClick={() => setShowCalendar(true)}
              icon={<CalendarIcon />}
            />
          </div>
        </div>

        <h1 className="max-w-xl font-serif text-4xl leading-tight tracking-tight text-stone-900 sm:text-5xl">
          Renew before it lapses.
        </h1>

        <TypeMarquee />

        <SummaryBar summary={summary} />
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Coming up</h2>
          <button
            type="button"
            onClick={() => setFormTarget({})}
            className="rounded-lg bg-emerald-800 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-900 hover:shadow-md active:translate-y-0"
          >
            Add renewal
          </button>
        </div>

        {renewals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white/50 px-5 py-8 text-sm leading-relaxed text-stone-600">
            Add your first renewal to see urgency buckets. Try a passport
            (90-day lead) next to a subscription (7-day lead) to see why a flat
            reminder rule fails.
          </div>
        ) : (
          <RenewalList
            grouped={grouped}
            onEdit={(renewal) => setFormTarget({ renewal })}
            onDone={handleMarkDone}
            onDelete={removeRenewal}
          />
        )}
      </section>

      {formTarget && (
        <RenewalFormModal
          renewal={formTarget.renewal}
          onSave={handleSave}
          onClose={() => setFormTarget(null)}
        />
      )}

      {showCalendar && (
        <CalendarPanel
          renewals={renewals}
          onClose={() => setShowCalendar(false)}
          onEdit={(renewal) => setFormTarget({ renewal })}
          onMarkDone={handleMarkDone}
        />
      )}

      {showNotifications && (
        <NotificationsPanel
          notifications={notifications}
          silencedCount={silencedCount}
          onClose={() => setShowNotifications(false)}
          onDismiss={(view) => setAcks((prev) => acknowledge(prev, view))}
          onDismissAll={() =>
            setAcks((prev) => acknowledgeAll(prev, notifications))
          }
          onMarkDone={handleMarkDone}
        />
      )}

      {toast && (
        <Toast
          message={toast}
          durationMs={TOAST_DURATION_MS}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

function HeaderButton({
  label,
  icon,
  badge,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        badge ? `${label}, ${badge} needing attention` : `Open ${label}`
      }
      className="group relative inline-flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-gradient-to-b from-white to-stone-50 px-2.5 py-2 text-sm font-medium text-stone-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-900/25 hover:shadow-md active:translate-y-0 sm:px-3.5"
    >
      <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-800 text-white transition group-hover:bg-emerald-900">
        {icon}
      </span>
      <span className="hidden sm:inline">{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white shadow-sm">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

function SummaryBar({ summary }: { summary: ReminderSummary }) {
  const cards: { label: string; value: number; accent: string }[] = [
    { label: "Total", value: summary.total, accent: "text-stone-900" },
    { label: "Overdue", value: summary.overdue, accent: "text-red-700" },
    { label: "Due soon", value: summary.dueSoon, accent: "text-amber-700" },
    { label: "Upcoming", value: summary.upcoming, accent: "text-stone-600" },
  ];

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-stone-200 bg-white/70 px-3 py-2.5"
        >
          <dt className="text-xs tracking-wide text-stone-500 uppercase">
            {card.label}
          </dt>
          <dd className={`text-2xl font-semibold ${card.accent}`}>
            {card.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className="h-4 w-4"
    >
      <rect x="2.75" y="4.25" width="14.5" height="13" rx="2.5" />
      <path d="M2.75 8.25h14.5M6.75 2.75v3M13.25 2.75v3" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M10 3a4.5 4.5 0 0 0-4.5 4.5c0 3-1.25 4-1.25 4h11.5s-1.25-1-1.25-4A4.5 4.5 0 0 0 10 3Z" />
      <path d="M8.5 14.5a1.75 1.75 0 0 0 3 0" />
    </svg>
  );
}
