/**
 * Worked examples for notification noise control.
 * Run with: npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acknowledge,
  acknowledgeAll,
  buildNotifications,
  pruneAcks,
  type AckMap,
} from "./notifications";
import { buildReminderDigest, buildReminderView } from "./reminders";
import type { Renewal } from "./types";

const now = new Date(2026, 7, 14); // 14 Aug 2026

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

describe("buildNotifications", () => {
  it("only notifies items inside their lead-time window", () => {
    const digest = buildReminderDigest(
      [
        // 6 days out, 7-day lead → nudges
        renewal({ name: "Netflix", type: "subscription", renewalDate: "2026-08-20" }),
        // ~140 days out, 90-day lead → silent
        renewal({ name: "Passport", type: "passport", renewalDate: "2027-01-01" }),
      ],
      now,
    );

    const notifications = buildNotifications(digest, {});
    assert.deepEqual(
      notifications.map((n) => n.renewal.name),
      ["Netflix"],
    );
  });

  it("stays quiet after the user dismisses it", () => {
    const view = buildReminderView(
      renewal({ name: "Netflix", type: "subscription", renewalDate: "2026-08-20" }),
      now,
    );
    const acks = acknowledge({}, view);

    assert.equal(buildNotifications([view], acks).length, 0);
  });

  it("comes back when the item escalates to act now", () => {
    const item = renewal({
      name: "Road tax",
      type: "road_tax",
      renewalDate: "2026-09-05", // 22 days out → soon
    });

    const soon = buildReminderView(item, now);
    assert.equal(soon.urgency, "soon");
    const acks = acknowledge({}, soon);
    assert.equal(buildNotifications([soon], acks).length, 0);

    // Two weeks later the same item is inside the 7-day action window.
    const later = buildReminderView(item, new Date(2026, 7, 31));
    assert.equal(later.urgency, "act_now");
    assert.equal(buildNotifications([later], acks).length, 1);
  });

  it("comes back for the next cycle after being renewed", () => {
    const item = renewal({
      name: "Gym",
      type: "subscription",
      renewalDate: "2026-08-20",
      cycle: "monthly",
    });
    const acks = acknowledge({}, buildReminderView(item, now));

    const nextCycle = buildReminderView(
      { ...item, renewalDate: "2026-09-20" },
      new Date(2026, 8, 16), // 4 days before the new date
    );
    assert.equal(buildNotifications([nextCycle], acks).length, 1);
  });

  it("does not resurface when the item merely becomes less urgent", () => {
    const item = renewal({
      name: "Road tax",
      type: "road_tax",
      renewalDate: "2026-08-18",
    });
    const actNow = buildReminderView(item, now);
    assert.equal(actNow.urgency, "act_now");
    const acks = acknowledge({}, actNow);

    // Same due date seen earlier in time, so it reads as "soon" instead.
    const soon = buildReminderView(item, new Date(2026, 6, 25));
    assert.equal(soon.urgency, "soon");
    assert.equal(buildNotifications([soon], acks).length, 0);
  });
});

describe("ack housekeeping", () => {
  it("acknowledgeAll silences the whole digest at once", () => {
    const digest = buildReminderDigest(
      [
        renewal({ name: "Netflix", type: "subscription", renewalDate: "2026-08-20" }),
        renewal({ name: "Road tax", type: "road_tax", renewalDate: "2026-08-25" }),
      ],
      now,
    );
    const acks = acknowledgeAll({}, digest);
    assert.equal(buildNotifications(digest, acks).length, 0);
  });

  it("pruneAcks forgets deleted renewals", () => {
    const acks: AckMap = {
      keep: { renewalDate: "2026-08-20", urgency: "soon" },
      gone: { renewalDate: "2026-08-20", urgency: "soon" },
    };
    assert.deepEqual(Object.keys(pruneAcks(acks, ["keep"])), ["keep"]);
  });
});
