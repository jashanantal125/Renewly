"use client";

import { useMemo, useState } from "react";
import {
  buildReminderDigest,
  formatDaysUntil,
  groupByUrgency,
  markRenewalDone,
} from "@/lib/reminders";
import { createRenewal, updateRenewal, type RenewalInput } from "@/lib/renewals";
import { useRenewals } from "@/lib/useRenewals";
import type { ReminderView, Renewal, RenewalCycle, RenewalType, Urgency } from "@/lib/types";
import {
  RENEWAL_CYCLE_LABELS,
  RENEWAL_TYPE_LABELS,
  URGENCY_ORDER,
} from "@/lib/types";
import { DEFAULT_LEAD_TIME_DAYS } from "@/lib/leadTimes";

type FormState = {
  name: string;
  type: RenewalType;
  renewalDate: string;
  cycle: RenewalCycle;
  customCycleDays: string;
  leadTimeOverrideDays: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  name: "",
  type: "subscription",
  renewalDate: "",
  cycle: "yearly",
  customCycleDays: "",
  leadTimeOverrideDays: "",
  notes: "",
});

const URGENCY_STYLES: Record<
  Urgency,
  { badge: string; border: string; title: string }
> = {
  overdue: {
    badge: "bg-red-100 text-red-800",
    border: "border-red-200",
    title: "Overdue",
  },
  act_now: {
    badge: "bg-amber-100 text-amber-900",
    border: "border-amber-200",
    title: "Act now",
  },
  soon: {
    badge: "bg-sky-100 text-sky-900",
    border: "border-sky-200",
    title: "Coming up",
  },
  later: {
    badge: "bg-stone-100 text-stone-700",
    border: "border-stone-200",
    title: "Later",
  },
};

function toInput(form: FormState): RenewalInput | null {
  if (!form.name.trim() || !form.renewalDate) return null;

  const customCycleDays =
    form.cycle === "custom" && form.customCycleDays
      ? Number(form.customCycleDays)
      : undefined;

  if (
    form.cycle === "custom" &&
    (customCycleDays == null ||
      Number.isNaN(customCycleDays) ||
      customCycleDays <= 0)
  ) {
    return null;
  }

  const leadTimeOverrideDays = form.leadTimeOverrideDays
    ? Number(form.leadTimeOverrideDays)
    : undefined;

  if (
    leadTimeOverrideDays != null &&
    (Number.isNaN(leadTimeOverrideDays) || leadTimeOverrideDays < 0)
  ) {
    return null;
  }

  return {
    name: form.name,
    type: form.type,
    renewalDate: form.renewalDate,
    cycle: form.cycle,
    customCycleDays,
    leadTimeOverrideDays,
    notes: form.notes || undefined,
  };
}

function formFromRenewal(renewal: Renewal): FormState {
  return {
    name: renewal.name,
    type: renewal.type,
    renewalDate: renewal.renewalDate,
    cycle: renewal.cycle,
    customCycleDays: renewal.customCycleDays?.toString() ?? "",
    leadTimeOverrideDays: renewal.leadTimeOverrideDays?.toString() ?? "",
    notes: renewal.notes ?? "",
  };
}

export default function Home() {
  const [renewals, setRenewals] = useRenewals();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const digest = useMemo(() => buildReminderDigest(renewals), [renewals]);
  const grouped = useMemo(() => groupByUrgency(digest), [digest]);
  const nudgeCount = digest.filter((d) => d.shouldNudge).length;

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
    setError(null);
    setShowForm(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = toInput(form);
    if (!input) {
      setError("Name, renewal date, and a valid cycle are required.");
      return;
    }

    if (editingId) {
      setRenewals((prev) =>
        prev.map((r) => (r.id === editingId ? updateRenewal(r, input) : r)),
      );
    } else {
      setRenewals((prev) => [...prev, createRenewal(input)]);
    }
    resetForm();
  }

  function startEdit(renewal: Renewal) {
    setForm(formFromRenewal(renewal));
    setEditingId(renewal.id);
    setShowForm(true);
    setError(null);
  }

  function removeRenewal(id: string) {
    setRenewals((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) resetForm();
  }

  function handleMarkDone(renewal: Renewal) {
    if (renewal.cycle === "once") {
      removeRenewal(renewal.id);
      return;
    }
    setRenewals((prev) =>
      prev.map((r) => (r.id === renewal.id ? markRenewalDone(r) : r)),
    );
  }

  return (
    <div className="min-h-full bg-[radial-gradient(ellipse_at_top,_#f4f7f2_0%,_#eef2f0_45%,_#e8ebe6_100%)] text-stone-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-10 sm:px-8 sm:py-14">
        <header className="space-y-3">
          <p className="text-sm font-medium tracking-[0.2em] text-emerald-800/80 uppercase">
            Renewly
          </p>
          <h1 className="max-w-xl font-serif text-4xl leading-tight tracking-tight text-stone-900 sm:text-5xl">
            Renew before it lapses.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-stone-600">
            Track road tax, licences, passports, insurance, and subscriptions.
            Nudges use lead times that match how long each renewal actually
            takes — not a flat seven-day alert for everything.
          </p>
          <p className="text-sm text-stone-500">
            {renewals.length === 0
              ? "No renewals yet."
              : `${nudgeCount} need attention · ${renewals.length} total`}
          </p>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Coming up</h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setForm(emptyForm());
                setError(null);
              }}
              className="rounded-md bg-emerald-800 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-emerald-900"
            >
              Add renewal
            </button>
          </div>

          {renewals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 bg-white/50 px-5 py-8 text-sm text-stone-600">
              Add your first renewal to see urgency buckets. Try a passport
              (90-day lead) next to a subscription (7-day lead) to see why a
              flat reminder rule fails.
            </div>
          ) : (
            <div className="space-y-6">
              {URGENCY_ORDER.map((urgency) => {
                const items = grouped[urgency];
                if (items.length === 0) return null;
                return (
                  <UrgencySection
                    key={urgency}
                    urgency={urgency}
                    items={items}
                    onEdit={startEdit}
                    onDone={handleMarkDone}
                    onDelete={removeRenewal}
                  />
                );
              })}
            </div>
          )}
        </section>

        {showForm && (
          <section className="rounded-xl border border-stone-200 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                {editingId ? "Edit renewal" : "New renewal"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-stone-500 hover:text-stone-800"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-stone-700">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Passport, Netflix, Car road tax"
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-stone-700">Type</span>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as RenewalType,
                    }))
                  }
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                >
                  {(Object.keys(RENEWAL_TYPE_LABELS) as RenewalType[]).map(
                    (t) => (
                      <option key={t} value={t}>
                        {RENEWAL_TYPE_LABELS[t]} (default{" "}
                        {DEFAULT_LEAD_TIME_DAYS[t]}d lead)
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-stone-700">
                  Renewal date
                </span>
                <input
                  required
                  type="date"
                  value={form.renewalDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, renewalDate: e.target.value }))
                  }
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-stone-700">Cycle</span>
                <select
                  value={form.cycle}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cycle: e.target.value as RenewalCycle,
                    }))
                  }
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                >
                  {(Object.keys(RENEWAL_CYCLE_LABELS) as RenewalCycle[]).map(
                    (c) => (
                      <option key={c} value={c}>
                        {RENEWAL_CYCLE_LABELS[c]}
                      </option>
                    ),
                  )}
                </select>
              </label>

              {form.cycle === "custom" && (
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-stone-700">
                    Custom cycle (days)
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={form.customCycleDays}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        customCycleDays: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                  />
                </label>
              )}

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-stone-700">
                  Lead time override (days, optional)
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.leadTimeOverrideDays}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      leadTimeOverrideDays: e.target.value,
                    }))
                  }
                  placeholder={`Default: ${DEFAULT_LEAD_TIME_DAYS[form.type]}`}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                />
              </label>

              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-stone-700">
                  Notes (optional)
                </span>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                />
              </label>

              {error && (
                <p className="sm:col-span-2 text-sm text-red-700">{error}</p>
              )}

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-900"
                >
                  {editingId ? "Save changes" : "Save renewal"}
                </button>
              </div>
            </form>
          </section>
        )}

        <footer className="border-t border-stone-200/80 pt-6 text-xs leading-relaxed text-stone-500">
          <p>
            Lead times: passport 90d · licence 60d · road tax / insurance 30d ·
            other 14d · subscription 7d. Urgency escalates into “act now” when
            remaining days fall inside the action window for that type.
          </p>
        </footer>
      </div>
    </div>
  );
}

function UrgencySection({
  urgency,
  items,
  onEdit,
  onDone,
  onDelete,
}: {
  urgency: Urgency;
  items: ReminderView[];
  onEdit: (r: Renewal) => void;
  onDone: (r: Renewal) => void;
  onDelete: (id: string) => void;
}) {
  const style = URGENCY_STYLES[urgency];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold tracking-wide text-stone-700 uppercase">
        {style.title}
        <span className="ml-2 font-normal normal-case text-stone-400">
          {items.length}
        </span>
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.renewal.id}
            className={`rounded-lg border bg-white/90 px-4 py-3 ${style.border}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-stone-900">
                    {item.renewal.name}
                  </p>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${style.badge}`}
                  >
                    {formatDaysUntil(item.daysUntil)}
                  </span>
                </div>
                <p className="text-sm text-stone-500">
                  {RENEWAL_TYPE_LABELS[item.renewal.type]} ·{" "}
                  {item.renewal.renewalDate} ·{" "}
                  {RENEWAL_CYCLE_LABELS[item.renewal.cycle]} · lead{" "}
                  {item.leadTimeDays}d
                </p>
                {item.renewal.notes && (
                  <p className="text-sm text-stone-500">{item.renewal.notes}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onDone(item.renewal)}
                  className="rounded-md border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  {item.renewal.cycle === "once" ? "Done" : "Renewed"}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(item.renewal)}
                  className="rounded-md border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.renewal.id)}
                  className="rounded-md border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
