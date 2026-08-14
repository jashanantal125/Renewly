/**
 * The session cookie is the only thing standing between a request and someone
 * else's renewals, so these cover the ways a forged cookie could get through.
 * Run with: npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeSession, encodeSession } from "./sessionToken";

const SECRET = "test-secret-value";
const PROFILE = { sub: "google-123", email: "user@example.com", name: "User" };

describe("session cookie", () => {
  it("round-trips a profile", () => {
    const { value } = encodeSession(PROFILE, SECRET);
    const decoded = decodeSession(value, SECRET);

    assert.equal(decoded?.sub, "google-123");
    assert.equal(decoded?.email, "user@example.com");
    assert.equal(decoded?.name, "User");
  });

  it("rejects a cookie signed with a different secret", () => {
    const { value } = encodeSession(PROFILE, "attacker-secret");
    assert.equal(decodeSession(value, SECRET), null);
  });

  it("rejects an edited payload", () => {
    const { value } = encodeSession(PROFILE, SECRET);
    const [, signature] = value.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...PROFILE, email: "victim@example.com", exp: 9e9 }),
      "utf8",
    ).toString("base64url");

    assert.equal(decodeSession(`${forged}.${signature}`, SECRET), null);
  });

  it("rejects an unsigned cookie", () => {
    const bare = Buffer.from(
      JSON.stringify({ ...PROFILE, exp: 9e9 }),
      "utf8",
    ).toString("base64url");

    assert.equal(decodeSession(bare, SECRET), null);
    assert.equal(decodeSession(`${bare}.`, SECRET), null);
  });

  it("rejects an expired cookie", () => {
    const { value } = encodeSession(PROFILE, SECRET, new Date(2026, 0, 1));
    // 31 days later, one past the 30-day lifetime.
    assert.equal(decodeSession(value, SECRET, new Date(2026, 1, 1)), null);
  });

  it("returns null when there is no cookie or no secret", () => {
    const { value } = encodeSession(PROFILE, SECRET);
    assert.equal(decodeSession(undefined, SECRET), null);
    assert.equal(decodeSession(value, undefined), null);
    assert.equal(decodeSession("garbage", SECRET), null);
  });
});
