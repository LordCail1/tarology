const DEFAULT_DEV_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/tarology?schema=public";
export function getDatabaseUrl(): string {
  const testOverride = process.env.TEST_DATABASE_URL?.trim();
  if (process.env.NODE_ENV === "test" && testOverride) {
    return testOverride;
  }

  const explicit = process.env.DATABASE_URL?.trim();
  if (explicit) {
    return explicit;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set.");
  }

  return DEFAULT_DEV_DATABASE_URL;
}
