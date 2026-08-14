"use client";

import { useState } from "react";
import type { RenewalInput } from "@/lib/renewals";
import { DEFAULT_LEAD_TIME_DAYS } from "@/lib/leadTimes";
import type { Renewal, RenewalCycle, RenewalType } from "@/lib/types";
import { RENEWAL_CYCLE_LABELS, RENEWAL_TYPE_LABELS } from "@/lib/types";
import { PanelShell } from "./PanelShell";

type FormState = {
  name: string;
  type: RenewalType;
  renewalDate: string;
  cycle: RenewalCycle;
  customCycleDays: string;
  leadTimeOverrideDays: string;
  notes: string;
};

function emptyForm(): FormState {
  return {
    name: "",
    type: "subscription",
    renewalDate: "",
    cycle: "yearly",
    customCycleDays: "",
    leadTimeOverrideDays: "",
    notes: "",
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

/** Returns the input, or the reason it is not valid yet. */
function toInput(form: FormState): { input: RenewalInput } | { error: string } {
  if (!form.name.trim()) return { error: "Give it a name you will recognise." };
  if (!form.renewalDate) return { error: "Pick the date it is due." };

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
    return { error: "A custom cycle needs a length of at least 1 day." };
  }

  const leadTimeOverrideDays = form.leadTimeOverrideDays
    ? Number(form.leadTimeOverrideDays)
    : undefined;

  if (
    leadTimeOverrideDays != null &&
    (Number.isNaN(leadTimeOverrideDays) || leadTimeOverrideDays < 0)
  ) {
    return { error: "Lead time must be zero or more days." };
  }

  return {
    input: {
      name: form.name,
      type: form.type,
      renewalDate: form.renewalDate,
      cycle: form.cycle,
      customCycleDays,
      leadTimeOverrideDays,
      notes: form.notes || undefined,
    },
  };
}

const FIELD_CLASS =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20";

export function RenewalFormModal({
  renewal,
  onSave,
  onClose,
}: {
  /** Present when editing an existing renewal. */
  renewal?: Renewal;
  onSave: (input: RenewalInput) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    renewal ? formFromRenewal(renewal) : emptyForm(),
  );
  const [error, setError] = useState<string | null>(null);

  const isEditing = renewal != null;
  const effectiveLead =
    form.leadTimeOverrideDays !== ""
      ? Number(form.leadTimeOverrideDays)
      : DEFAULT_LEAD_TIME_DAYS[form.type];

  return (
    <PanelShell
      align="center"
      label={isEditing ? "Edit renewal" : "New renewal"}
      onClose={onClose}
    >
      {(close) => (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const result = toInput(form);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            onSave(result.input);
            close();
          }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
            <div>
              <h2 className="font-serif text-xl tracking-tight text-stone-900">
                {isEditing ? "Edit renewal" : "New renewal"}
              </h2>
              <p className="mt-0.5 text-sm text-stone-500">
                Reminders start{" "}
                <span className="font-medium text-emerald-800">
                  {Number.isFinite(effectiveLead) ? effectiveLead : 0} days
                </span>{" "}
                before the due date.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="rounded-md px-2 py-1 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
            >
              ✕
            </button>
          </div>

          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-stone-700">Name</span>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setError(null);
                }}
                placeholder="e.g. Passport, Netflix, Car road tax"
                className={FIELD_CLASS}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-stone-700">Type</span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as RenewalType }))
                }
                className={FIELD_CLASS}
              >
                {(Object.keys(RENEWAL_TYPE_LABELS) as RenewalType[]).map((t) => (
                  <option key={t} value={t}>
                    {RENEWAL_TYPE_LABELS[t]} ({DEFAULT_LEAD_TIME_DAYS[t]}d lead)
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-stone-700">
                Renewal date
              </span>
              <input
                type="date"
                value={form.renewalDate}
                onChange={(e) => {
                  setForm((f) => ({ ...f, renewalDate: e.target.value }));
                  setError(null);
                }}
                className={FIELD_CLASS}
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
                className={FIELD_CLASS}
              >
                {(Object.keys(RENEWAL_CYCLE_LABELS) as RenewalCycle[]).map((c) => (
                  <option key={c} value={c}>
                    {RENEWAL_CYCLE_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>

            {form.cycle === "custom" && (
              <label className="animate-detail-in block space-y-1.5">
                <span className="text-sm font-medium text-stone-700">
                  Custom cycle (days)
                </span>
                <input
                  type="number"
                  min={1}
                  value={form.customCycleDays}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, customCycleDays: e.target.value }));
                    setError(null);
                  }}
                  className={FIELD_CLASS}
                />
              </label>
            )}

            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-stone-700">
                Lead time override (days, optional)
              </span>
              <input
                type="number"
                min={0}
                value={form.leadTimeOverrideDays}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    leadTimeOverrideDays: e.target.value,
                  }));
                  setError(null);
                }}
                placeholder={`Default for ${RENEWAL_TYPE_LABELS[
                  form.type
                ].toLowerCase()}: ${DEFAULT_LEAD_TIME_DAYS[form.type]} days`}
                className={FIELD_CLASS}
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
                className={FIELD_CLASS}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50/80 px-5 py-4">
            {error ? (
              <p className="animate-detail-in text-sm text-red-700">{error}</p>
            ) : (
              <span className="text-xs text-stone-500">
                Stored in this browser only.
              </span>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-900 hover:shadow-md active:translate-y-0"
              >
                {isEditing ? "Save changes" : "Save renewal"}
              </button>
            </div>
          </div>
        </form>
      )}
    </PanelShell>
  );
}
