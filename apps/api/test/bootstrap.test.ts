import { afterEach, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { configureApp } from "../src/bootstrap.js";

const ENV_KEYS = [
  "NODE_ENV",
  "SESSION_SECRET",
  "WEB_APP_URL",
  "API_BASE_URL",
] as const;

function snapshotEnv(): Record<(typeof ENV_KEYS)[number], string | undefined> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    SESSION_SECRET: process.env.SESSION_SECRET,
    WEB_APP_URL: process.env.WEB_APP_URL,
    API_BASE_URL: process.env.API_BASE_URL,
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

describe("configureApp", () => {
  const originalEnv = snapshotEnv();

  afterEach(() => {
    restoreEnv(originalEnv);
  });

  it("trusts the first proxy hop when secure cookies are enabled", async () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "test-session-secret";
    process.env.WEB_APP_URL = "https://app.example.com";
    process.env.API_BASE_URL = "https://api.example.com";

    const moduleRef = await Test.createTestingModule({}).compile();
    const app = moduleRef.createNestApplication();

    configureApp(app);

    expect(app.getHttpAdapter().getInstance().get("trust proxy")).toBe(1);

    await app.close();
  });
});
