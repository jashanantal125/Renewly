/**
 * Worked examples for the calendar grid and cycle projection.
 * Run with: npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCalendarMonth,
  findDay,
  monthEntries,
  projectOccurrencesInRange,
  shiftMonth,
} from "./calendar";
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

const now = new Date(2026, 7, 14); // 14 Aug 2026

describe("shiftMonth", () => {
  it("wraps across year boundaries", () => {
    assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
    assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
  });
});

describe("buildCalendarMonth", () => {
  it("always renders a 6x7 grid starting on Monday", () => {
    const calendar = buildCalendarMonth([], 2026, 7, now);
    assert.equal(calendar.weeks.length, 6);
    assert.ok(calendar.weeks.every((week) => week.length === 7));
    // 1 Aug 2026 is a Saturday, so the grid starts Mon 27 Jul.
    assert.equal(calendar.weeks[0][0].iso, "2026-07-27");
    assert.equal(calendar.weeks[0][0].inCurrentMonth, false);
  });

  it("marks today and places renewals on their day", () => {
    const calendar = buildCalendarMonth(
      [renewal({ name: "Road tax", type: "road_tax", renewalDate: "2026-08-20" })],
      2026,
      7,
      now,
    );

    const today = findDay(calendar, "2026-08-14");
    assert.equal(today?.isToday, true);

    const dueDay = findDay(calendar, "2026-08-20");
    assert.equal(dueDay?.entries.length, 1);
    assert.equal(dueDay?.entries[0].isProjected, false);
    // 6 days out sits inside road tax's 7-day action window, so it escalates.
    assert.equal(dueDay?.entries[0].view.urgency, "act_now");
  });

  it("projects a monthly subscription into a future month", () => {
    const calendar = buildCalendarMonth(
      [
        renewal({
          name: "Netflix",
          type: "subscription",
          renewalDate: "2026-08-20",
          cycle: "monthly",
        }),
      ],
      2026,
      9, // October
      now,
    );

    const october = findDay(calendar, "2026-10-20");
    assert.equal(october?.entries.length, 1);
    assert.equal(october?.entries[0].isProjected, true);
  });

  it("does not project one-time renewals forward", () => {
    const calendar = buildCalendarMonth(
      [
        renewal({
          name: "Visa appointment",
          type: "other",
          renewalDate: "2026-08-20",
          cycle: "once",
        }),
      ],
      2026,
      8, // September
      now,
    );

    const anyEntries = calendar.weeks
      .flat()
      .some((day) => day.entries.length > 0);
    assert.equal(anyEntries, false);
  });
});

describe("monthEntries", () => {
  it("lists the month's occurrences in date order, excluding spill-over days", () => {
    const calendar = buildCalendarMonth(
      [
        renewal({ name: "Road tax", type: "road_tax", renewalDate: "2026-08-20" }),
        renewal({ name: "Car insurance", type: "insurance", renewalDate: "2026-08-03" }),
        // 30 July falls in the grid's first row but not in August.
        renewal({ name: "Old bill", type: "other", renewalDate: "2026-07-30" }),
      ],
      2026,
      7,
      now,
    );

    assert.deepEqual(
      monthEntries(calendar).map((entry) => `${entry.iso} ${entry.renewal.name}`),
      ["2026-08-03 Car insurance", "2026-08-20 Road tax"],
    );
  });
});

describe("projectOccurrencesInRange", () => {
  it("clamps end-of-month when projecting monthly cycles", () => {
    const occurrences = projectOccurrencesInRange(
      renewal({
        name: "Gym",
        type: "subscription",
        renewalDate: "2026-01-31",
        cycle: "monthly",
      }),
      "2026-01-01",
      "2026-04-30",
    );

    assert.deepEqual(
      occurrences.map((o) => o.iso),
      ["2026-01-31", "2026-02-28", "2026-03-28", "2026-04-28"],
    );
    assert.equal(occurrences[0].isProjected, false);
    assert.equal(occurrences[1].isProjected, true);
  });

  it("skips occurrences before the range start", () => {
    const occurrences = projectOccurrencesInRange(
      renewal({
        name: "Netflix",
        type: "subscription",
        renewalDate: "2026-06-10",
        cycle: "monthly",
      }),
      "2026-08-01",
      "2026-08-31",
    );

    assert.deepEqual(
      occurrences.map((o) => o.iso),
      ["2026-08-10"],
    );
    assert.equal(occurrences[0].isProjected, true);
  });
});
