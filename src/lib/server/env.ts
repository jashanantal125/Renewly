/**
 * Server-only environment access.
 *
 * Every integration is optional: without these variables the app still runs as
 * the offline localStorage tracker, and the email sign-in call to action is
 * hidden rather than shown broken.
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export const env = {
  googleClientId: read("GOOGLE_CLIENT_ID"),
  googleClientSecret: read("GOOGLE_CLIENT_SECRET"),
  authSecret: read("AUTH_SECRET"),
  mongodbUri: read("MONGODB_URI"),
  mongodbDb: read("MONGODB_DB") ?? "renewly",
  gmailUser: read("GMAIL_USER"),
  gmailAppPassword: read("GMAIL_APP_PASSWORD"),
  cronSecret: read("CRON_SECRET"),
  appUrl: read("APP_URL") ?? read("NEXT_PUBLIC_APP_URL"),
};

/** Sign-in needs OAuth credentials, a cookie secret, and somewhere to store users. */
export function isAuthConfigured(): boolean {
  return Boolean(
    env.googleClientId && env.googleClientSecret && env.authSecret && env.mongodbUri,
  );
}

export function isMailConfigured(): boolean {
  return Boolean(env.gmailUser && env.gmailAppPassword);
}

/**
 * Base URL used to build the OAuth redirect URI. Falls back to the request
 * origin so local development works without extra configuration.
 */
export function resolveAppUrl(request: Request): string {
  if (env.appUrl) return env.appUrl.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export function googleRedirectUri(request: Request): string {
  return `${resolveAppUrl(request)}/api/auth/callback/google`;
}
