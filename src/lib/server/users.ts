import type { Collection } from "mongodb";
import type { AckMap } from "../notifications";
import type { Renewal } from "../types";
import { getDb } from "./mongo";

export interface UserDoc {
  /** Google `sub`, used as the primary key so sign-in is idempotent. */
  _id: string;
  email: string;
  name?: string;
  picture?: string;
  emailRemindersEnabled: boolean;
  /**
   * Mirror of the browser's list. The reminder job cannot read localStorage,
   * so signing in copies the list here for it to work from.
   */
  renewals: Renewal[];
  /**
   * Which nudges have already been emailed, keyed by renewal id and recording
   * the due date and urgency at send time. Reuses the in-app acknowledgement
   * shape so the same escalation rules decide when to email again.
   */
  emailedNudges: AckMap;
  lastEmailedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Identity from the signed session cookie, enough to recreate a missing row. */
export interface UserProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

async function users(): Promise<Collection<UserDoc>> {
  const db = await getDb();
  return db.collection<UserDoc>("users");
}

export async function upsertUser(profile: UserProfile): Promise<UserDoc> {
  const collection = await users();
  const now = new Date().toISOString();

  await collection.updateOne(
    { _id: profile.sub },
    {
      $set: {
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        updatedAt: now,
      },
      $setOnInsert: {
        // Signing in *is* the opt-in, so reminders start enabled.
        emailRemindersEnabled: true,
        renewals: [],
        emailedNudges: {},
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const doc = await collection.findOne({ _id: profile.sub });
  if (!doc) throw new Error("Failed to load user after upsert");
  return doc;
}

export async function getUser(sub: string): Promise<UserDoc | null> {
  const collection = await users();
  return collection.findOne({ _id: sub });
}

/**
 * Update the user's row, recreating it first if it has gone.
 *
 * A session cookie outlives the database row it was created for — the row can be
 * dropped while a valid cookie is still in the browser. Without this the write
 * would match nothing and silently do nothing, so the user would toggle a
 * setting or add a renewal and see it quietly fail to stick.
 */
async function updateUser(
  profile: UserProfile,
  fields: Partial<UserDoc>,
): Promise<void> {
  const collection = await users();
  const update = { $set: { ...fields, updatedAt: new Date().toISOString() } };

  const result = await collection.updateOne({ _id: profile.sub }, update);
  if (result.matchedCount === 0) {
    await upsertUser(profile);
    await collection.updateOne({ _id: profile.sub }, update);
  }
}

export async function setEmailReminders(
  profile: UserProfile,
  enabled: boolean,
): Promise<void> {
  await updateUser(profile, { emailRemindersEnabled: enabled });
}

export async function replaceRenewals(
  profile: UserProfile,
  renewals: Renewal[],
): Promise<void> {
  await updateUser(profile, { renewals });
}

export async function recordEmailedNudges(
  sub: string,
  emailedNudges: AckMap,
): Promise<void> {
  const collection = await users();
  const now = new Date().toISOString();
  await collection.updateOne(
    { _id: sub },
    { $set: { emailedNudges, lastEmailedAt: now, updatedAt: now } },
  );
}

export async function listUsersForReminders(): Promise<UserDoc[]> {
  const collection = await users();
  return collection.find({ emailRemindersEnabled: true }).toArray();
}
