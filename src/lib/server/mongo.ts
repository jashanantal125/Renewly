import { MongoClient, type Db } from "mongodb";
import { env } from "./env";

/**
 * One MongoClient per process, cached on globalThis.
 *
 * Next.js reloads modules in development and serverless functions may reuse a
 * warm process, so creating a client per request would leak connections until
 * Atlas refused new ones.
 */
const globalForMongo = globalThis as unknown as {
  renewlyMongoClient?: Promise<MongoClient>;
};

function clientPromise(): Promise<MongoClient> {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (!globalForMongo.renewlyMongoClient) {
    globalForMongo.renewlyMongoClient = new MongoClient(env.mongodbUri, {
      // Keep the pool small: serverless instances each hold their own.
      maxPoolSize: 5,
      // Fail fast instead of letting a request hang for the 30s default when
      // the cluster is unreachable.
      serverSelectionTimeoutMS: 5000,
    }).connect();
  }
  return globalForMongo.renewlyMongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(env.mongodbDb);
}
