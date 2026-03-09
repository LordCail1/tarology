export const SESSION_COOKIE_NAME = "tarology.sid";

const DEFAULT_API_BASE_URL = "http://localhost:3001";
const DEFAULT_WEB_APP_URL = "http://localhost:3000";
const DEFAULT_DEV_SESSION_SECRET = "tarology-dev-session-secret";

export interface IdentityRuntimeConfig {
  apiBaseUrl: string;
  webAppUrl: string;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  sessionSecret: string;
  secureCookies: boolean;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getSessionSecret(): string {
  const explicit = process.env.SESSION_SECRET?.trim();
  if (explicit) {
    return explicit;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  }

  return DEFAULT_DEV_SESSION_SECRET;
}

export function getIdentityRuntimeConfig(): IdentityRuntimeConfig {
  const apiBaseUrl = stripTrailingSlash(process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL);
  const webAppUrl = stripTrailingSlash(process.env.WEB_APP_URL ?? DEFAULT_WEB_APP_URL);

  return {
    apiBaseUrl,
    webAppUrl,
    googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "missing-google-client-id",
    googleClientSecret:
      process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "missing-google-client-secret",
    googleCallbackUrl:
      process.env.GOOGLE_OAUTH_CALLBACK_URL ?? `${apiBaseUrl}/v1/auth/google/callback`,
    sessionSecret: getSessionSecret(),
    secureCookies: process.env.NODE_ENV === "production",
  };
}
