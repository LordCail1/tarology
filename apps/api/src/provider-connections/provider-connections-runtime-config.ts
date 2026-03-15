import type { AuthenticatedUser } from "@tarology/shared";

const DEFAULT_DEV_PROVIDER_CREDENTIAL_SECRET =
  "tarology-dev-provider-credential-secret";
const PROVIDER_ACCOUNT_CHALLENGE_TTL_MS = 10 * 60 * 1000;

export interface ProviderConnectionsRuntimeConfig {
  credentialSecret: string;
  openAiProviderAccountAllowlist: Set<string>;
  providerAccountChallengeTtlMs: number;
}

function getCredentialSecret(): string {
  const explicit = process.env.PROVIDER_CREDENTIAL_SECRET?.trim();
  if (explicit) {
    return explicit;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("PROVIDER_CREDENTIAL_SECRET must be set in production.");
  }

  return DEFAULT_DEV_PROVIDER_CREDENTIAL_SECRET;
}

function parseAllowlist(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  );
}

export function getProviderConnectionsRuntimeConfig(): ProviderConnectionsRuntimeConfig {
  return {
    credentialSecret: getCredentialSecret(),
    openAiProviderAccountAllowlist: parseAllowlist(
      process.env.OPENAI_PROVIDER_ACCOUNT_ALLOWLIST
    ),
    providerAccountChallengeTtlMs: PROVIDER_ACCOUNT_CHALLENGE_TTL_MS,
  };
}

export function isOpenAiProviderAccountAllowlisted(
  config: ProviderConnectionsRuntimeConfig,
  user: AuthenticatedUser
): boolean {
  const normalizedUserId = user.userId.trim().toLowerCase();
  const normalizedEmail = user.email.trim().toLowerCase();

  return (
    config.openAiProviderAccountAllowlist.has(normalizedUserId) ||
    config.openAiProviderAccountAllowlist.has(normalizedEmail)
  );
}
