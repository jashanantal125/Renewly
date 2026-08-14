/**
 * The sync endpoint accepts JSON from the browser, and whatever it stores is
 * later fed to the date maths in the reminder job. These cover the malformed
 * shapes that would otherwise reach it.
 * Run with: npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_SYNCED_RENEWALS, parseRenewal, parseRenewalList } from "./validateRenewal";

const VALID = {
  id: "abc",
  name: "Road tax",
  type: "road_tax",
  cycle: "yearly",
  renewalDate: "2026-09-05",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("parseRenewal", () => {
  it("accepts a well-formed renewal", () => {
    const parsed = parseRenewal(VALID);
    assert.equal(parsed?.name, "Road tax");
    assert.equal(parsed?.type, "road_tax");
  });

  it("rejects unknown types and cycles", () => {
    assert.equal(parseRenewal({ ...VALID, type: "spaceship" }), null);
    assert.equal(parseRenewal({ ...VALID, cycle: "fortnightly" }), null);
  });

  it("rejects dates the calendar maths cannot use", () => {
    assert.equal(parseRenewal({ ...VALID, renewalDate: "05-09-2026" }), null);
    assert.equal(parseRenewal({ ...VALID, renewalDate: "2026-13-45" }), null);
    assert.equal(parseRenewal({ ...VALID, renewalDate: "" }), null);
  });

  it("rejects missing or empty required fields", () => {
    assert.equal(parseRenewal({ ...VALID, id: "" }), null);
    assert.equal(parseRenewal({ ...VALID, name: "   " }), null);
    assert.equal(parseRenewal(null), null);
    assert.equal(parseRenewal("not an object"), null);
  });

  it("drops optional fields that are the wrong shape", () => {
    const parsed = parseRenewal({
      ...VALID,
      customCycleDays: "many",
      leadTimeOverrideDays: -5,
      notes: 42,
    });

    assert.equal(parsed?.customCycleDays, undefined);
    assert.equal(parsed?.leadTimeOverrideDays, undefined);
    assert.equal(parsed?.notes, undefined);
  });

  it("caps a very long name rather than rejecting the sync", () => {
    const parsed = parseRenewal({ ...VALID, name: "a".repeat(500) });
    assert.equal(parsed?.name.length, 120);
  });
});

describe("parseRenewalList", () => {
  it("accepts an empty list", () => {
    assert.deepEqual(parseRenewalList([]), []);
  });

  it("rejects the whole list if one item is bad", () => {
    assert.equal(parseRenewalList([VALID, { ...VALID, type: "nope" }]), null);
  });

  it("rejects a list that is not an array", () => {
    assert.equal(parseRenewalList({ 0: VALID }), null);
    assert.equal(parseRenewalList(undefined), null);
  });

  it("rejects a list past the stored cap", () => {
    const tooMany = Array.from({ length: MAX_SYNCED_RENEWALS + 1 }, (_, i) => ({
      ...VALID,
      id: `id-${i}`,
    }));
    assert.equal(parseRenewalList(tooMany), null);
  });
});
