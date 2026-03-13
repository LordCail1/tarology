import { afterEach, describe, expect, it } from "vitest";
import { PrismaService } from "../src/database/prisma.service.js";

const ENV_KEYS = ["NODE_ENV", "DATABASE_URL", "TEST_DATABASE_URL"] as const;

function snapshotEnv(): Record<(typeof ENV_KEYS)[number], string | undefined> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
  };
}

function restoreEnv(snapshot: Record<(typeof ENV_KEYS)[number], string | undefined>): void {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

describe("PrismaService", () => {
  const originalEnv = snapshotEnv();

  afterEach(async () => {
    restoreEnv(originalEnv);
  });

  it("prefers TEST_DATABASE_URL over DATABASE_URL in test mode", async () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgresql://prod-user:prod-pass@db.example.com:5432/prod";
    process.env.TEST_DATABASE_URL =
      "postgresql://test-user:test-pass@localhost:5432/tarology_test";

    const prisma = new PrismaService();

    expect(process.env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL);

    await prisma.$disconnect();
  });
});
