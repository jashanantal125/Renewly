/**
 * Worked examples for the reminder engine.
 * Run with: npx tsx --test src/lib/reminders.test.ts
 *
 * These fixtures are the "hand-checked" cases we use to verify
 * lead times and urgency buckets behave as designed.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildReminderView,
  classifyUrgency,
  formatDaysUntil,
  markRenewalDone,
  nextRenewalDate,
  sortReminders,
} from "./reminders";
import type { Renewal } from "./types";

function renewal(partial: Partial<Renewal> & Pick<Renewal, "name" | "type" | "renewalDate">): Renewal {
  return {
    id: partial.id ?? "test-id",
    cycle: partial.cycle ?? "yearly",
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("classifyUrgency", () => {
  it("marks past dates as overdue", () => {
    assert.equal(classifyUrgency(-3, 30, 7), "overdue");
  });

  it("uses action window for act_now, not the full lead time", () => {
    // Road tax: lead 30, action 7 → day 5 is act_now, day 20 is soon
    assert.equal(classifyUrgency(5, 30, 7), "act_now");
    assert.equal(classifyUrgency(20, 30, 7), "soon");
    assert.equal(classifyUrgency(45, 30, 7), "later");
  });

  it("rejects naive flat 7-day nudges for passports", () => {
    // Passport lead 90, action 21. At 40 days out, we should already nudge (soon),
    // not wait until 7 days before.
    assert.equal(classifyUrgency(40, 90, 21), "soon");
    assert.equal(classifyUrgency(10, 90, 21), "act_now");
  });
});

describe("buildReminderView", () => {
  const now = new Date(2026, 7, 14); // 14 Aug 2026 local

  it("applies type-based lead time for subscriptions", () => {
    const view = buildReminderView(
      renewal({
        name: "Netflix",
        type: "subscription",
        renewalDate: "2026-08-20", // 6 days out
      }),
      now,
    );
    assert.equal(view.daysUntil, 6);
    assert.equal(view.leadTimeDays, 7);
    assert.equal(view.urgency, "soon");
    assert.equal(view.shouldNudge, true);
  });

  it("keeps a passport outside the window as later", () => {
    const view = buildReminderView(
      renewal({
        name: "Passport",
        type: "passport",
        renewalDate: "2027-01-01", // ~140 days out
      }),
      now,
    );
    assert.equal(view.urgency, "later");
    assert.equal(view.shouldNudge, false);
    assert.equal(view.leadTimeDays, 90);
  });

  it("respects lead time overrides", () => {
    const view = buildReminderView(
      renewal({
        name: "Custom",
        type: "other",
        renewalDate: "2026-08-20",
        leadTimeOverrideDays: 3,
      }),
      now,
    );
    assert.equal(view.leadTimeDays, 3);
    assert.equal(view.urgency, "later"); // 6 days > 3 lead
  });
});

describe("sortReminders", () => {
  it("orders overdue before later", () => {
    const now = new Date(2026, 7, 14);
    const views = [
      buildReminderView(
        renewal({ name: "Later item", type: "other", renewalDate: "2026-12-01" }),
        now,
      ),
      buildReminderView(
        renewal({ name: "Overdue item", type: "other", renewalDate: "2026-08-01" }),
        now,
      ),
    ];
    const sorted = sortReminders(views);
    assert.equal(sorted[0].renewal.name, "Overdue item");
    assert.equal(sorted[1].renewal.name, "Later item");
  });
});

describe("cycle advance", () => {
  it("advances monthly and clamps end-of-month", () => {
    assert.equal(nextRenewalDate("2026-01-31", "monthly"), "2026-02-28");
    assert.equal(nextRenewalDate("2026-08-14", "yearly"), "2027-08-14");
    assert.equal(nextRenewalDate("2026-08-14", "custom", 30), "2026-09-13");
    assert.equal(nextRenewalDate("2026-08-14", "once"), null);
  });

  it("markRenewalDone moves recurring items forward", () => {
    const done = markRenewalDone(
      renewal({
        name: "Insurance",
        type: "insurance",
        renewalDate: "2026-08-14",
        cycle: "yearly",
      }),
      new Date("2026-08-14T10:00:00.000Z"),
    );
    assert.equal(done.renewalDate, "2027-08-14");
  });
});

describe("formatDaysUntil", () => {
  it("formats today, tomorrow, and overdue", () => {
    assert.equal(formatDaysUntil(0), "Due today");
    assert.equal(formatDaysUntil(1), "Due tomorrow");
    assert.equal(formatDaysUntil(-2), "2 days overdue");
  });
});
