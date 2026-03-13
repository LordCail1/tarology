import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/bootstrap.js";
import { configureApiTestEnvironment } from "./test-environment.js";

describe("Auth baseline API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    configureApiTestEnvironment();

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
        deckId: "thoth",
      })
      .expect(401);
  });

  it("returns 401 for profile, preferences, and deck catalog without auth", async () => {
    await request(app.getHttpServer()).get("/v1/profile").expect(401);
    await request(app.getHttpServer()).get("/v1/preferences").expect(401);
    await request(app.getHttpServer()).patch("/v1/preferences").send({
      defaultDeckId: "thoth",
    }).expect(401);
    await request(app.getHttpServer()).get("/v1/decks").expect(401);
  });

  it("keeps logout idempotent without an active session", async () => {
    const first = await request(app.getHttpServer()).post("/v1/auth/logout").expect(200);
    expect(first.body).toEqual({ success: true });

    const second = await request(app.getHttpServer()).post("/v1/auth/logout").expect(200);
    expect(second.body).toEqual({ success: true });
  });
});
