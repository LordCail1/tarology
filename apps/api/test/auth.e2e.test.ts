import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/bootstrap.js";

describe("Auth baseline API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.SESSION_SECRET = "test-session-secret";
    process.env.WEB_APP_URL = "http://localhost:3000";
    process.env.API_BASE_URL = "http://localhost:3001";
    process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_OAUTH_CALLBACK_URL =
      "http://localhost:3001/v1/auth/google/callback";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 401 for session lookup without auth", async () => {
    await request(app.getHttpServer()).get("/v1/auth/session").expect(401);
  });

  it("returns 401 for reading creation without auth", async () => {
    await request(app.getHttpServer())
      .post("/v1/readings")
      .send({
        rootQuestion: "Will this stay protected?",
        deckSpecVersion: "rider-waite-v1",
      })
      .expect(401);
  });

  it("keeps logout idempotent without an active session", async () => {
    const first = await request(app.getHttpServer()).post("/v1/auth/logout").expect(200);
    expect(first.body).toEqual({ success: true });

    const second = await request(app.getHttpServer()).post("/v1/auth/logout").expect(200);
    expect(second.body).toEqual({ success: true });
  });
});
