export function getDatabaseUrl(): string {
  const testOverride = process.env.TEST_DATABASE_URL?.trim();
  if (process.env.NODE_ENV === "test" && testOverride) {
    return testOverride;
  }

  const explicit = process.env.DATABASE_URL?.trim();
  if (explicit) {
    return explicit;
  }

  throw new Error("DATABASE_URL must be set.");
}
