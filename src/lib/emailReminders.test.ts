/**
 * Worked examples for the scheduled email job.
 * Run with: npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planReminderEmails } from "./emailReminders";
import type { Renewal } from "./types";

function renewal(
  partial: Partial<Renewal> & Pick<Renewal, "name" | "type" | "renewalDate">,
): Renewal {
  return {
    id: partial.id ?? `id-${partial.name}`,
    cycle: partial.cycle ?? "yearly",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("planReminderEmails", () => {
  const now = new Date(2026, 7, 14); // 14 Aug 2026

  it("emails only items inside their lead-time window", () => {
    const plan = planReminderEmails(
      [
        renewal({ name: "Netflix", type: "subscription", renewalDate: "2026-08-20" }),
        renewal({ name: "Passport", type: "passport", renewalDate: "2027-06-01" }),
      ],
      {},
      now,
    );

    assert.deepEqual(
      plan.views.map((view) => view.renewal.name),
      ["Netflix"],
    );
  });

  it("does not email the same nudge twice on a later run", () => {
    const items = [
      renewal({ name: "Netflix", type: "subscription", renewalDate: "2026-08-20" }),
    ];

    const first = planReminderEmails(items, {}, now);
    assert.equal(first.views.length, 1);

    // Next morning, same urgency: nothing new to say.
    const second = planReminderEmails(
      items,
      first.nextEmailedNudges,
      new Date(2026, 7, 15),
    );
    assert.equal(second.views.length, 0);
  });

  it("emails again when an item escalates to act now", () => {
    const items = [
      renewal({ name: "Road tax", type: "road_tax", renewalDate: "2026-09-05" }),
    ];

    const first = planReminderEmails(items, {}, now);
    assert.equal(first.views[0].urgency, "soon");

    const escalated = planReminderEmails(
      items,
      first.nextEmailedNudges,
      new Date(2026, 7, 31), // inside the 7-day action window
    );
    assert.equal(escalated.views.length, 1);
    assert.equal(escalated.views[0].urgency, "act_now");
  });

  it("emails again for the next cycle after renewing", () => {
    const item = renewal({
      name: "Gym",
      type: "subscription",
      renewalDate: "2026-08-20",
      cycle: "monthly",
    });

    const first = planReminderEmails([item], {}, now);
    assert.equal(first.views.length, 1);

    const nextCycle = planReminderEmails(
      [{ ...item, renewalDate: "2026-09-20" }],
      first.nextEmailedNudges,
      new Date(2026, 8, 16),
    );
    assert.equal(nextCycle.views.length, 1);
  });

  it("sends nothing when there is nothing to say", () => {
    const plan = planReminderEmails(
      [renewal({ name: "Passport", type: "passport", renewalDate: "2027-06-01" })],
      {},
      now,
    );
    assert.equal(plan.views.length, 0);
    assert.deepEqual(plan.nextEmailedNudges, {});
  });
});
