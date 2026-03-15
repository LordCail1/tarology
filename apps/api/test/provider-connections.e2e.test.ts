import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { ExecutionContext, INestApplication } from "@nestjs/common";
import request from "supertest";
import type { AuthenticatedUser } from "@tarology/shared";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/bootstrap.js";
import { SessionAuthGuard } from "../src/identity/session-auth.guard.js";
import {
  OTHER_TEST_USER,
  TEST_USER,
  configureApiTestEnvironment,
  createTestPrisma,
  resetDatabase,
} from "./test-environment.js";

function buildSessionGuard(user: AuthenticatedUser) {
  return {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest<{
        session?: { user?: AuthenticatedUser };
      }>();

      request.session ??= {};
      request.session.user = user;
      return true;
    },
  };
}

async function createAuthorizedApp(user: AuthenticatedUser): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(SessionAuthGuard)
    .useValue(buildSessionGuard(user))
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  openApps.push(app);
  return app;
}

const openApps: INestApplication[] = [];

async function closeTrackedApp(app: INestApplication): Promise<void> {
  const index = openApps.indexOf(app);
  if (index >= 0) {
    openApps.splice(index, 1);
  }

  await app.close();
}

describe("Provider connections API", () => {
  beforeAll(() => {
    configureApiTestEnvironment();
  });

  beforeEach(async () => {
    process.env.OPENAI_PROVIDER_ACCOUNT_ALLOWLIST = "";
    const prisma = await createTestPrisma();
    await resetDatabase(prisma);
    await prisma.user.create({
      data: {
        id: TEST_USER.userId,
        email: TEST_USER.email,
      },
    });
    await prisma.user.create({
      data: {
        id: OTHER_TEST_USER.userId,
        email: OTHER_TEST_USER.email,
      },
    });
    await prisma.$disconnect();
  });

  afterEach(async () => {
    process.env.OPENAI_PROVIDER_ACCOUNT_ALLOWLIST = "";
    while (openApps.length > 0) {
      const app = openApps.pop();
      if (app) {
        await app.close();
      }
    }
  });

  it("lists provider capabilities and starts with no saved connections", async () => {
    const app = await createAuthorizedApp(TEST_USER);

    const response = await request(app.getHttpServer())
      .get("/v1/provider-connections")
      .expect(200);

    expect(response.body).toEqual({
      capabilities: [
        {
          provider: "openai",
          supportsApiKey: true,
          supportsProviderAccount: false,
          supportsStreaming: false,
          supportsBackground: false,
          providerAccountNotice: "Not available for this account yet.",
        },
      ],
      connections: [],
    });

    await closeTrackedApp(app);
  }, 15_000);

  it("stores OpenAI API keys encrypted at rest and manages default selection", async () => {
    const app = await createAuthorizedApp(TEST_USER);

    const firstCreate = await request(app.getHttpServer())
      .post("/v1/provider-connections/api-key")
      .send({
        provider: "openai",
        displayName: "Primary OpenAI",
        apiKey: "sk-live-primary-1234",
      })
      .expect(201);

    expect(firstCreate.body.connection).toMatchObject({
      provider: "openai",
      credentialMode: "api_key",
      status: "active",
      displayName: "Primary OpenAI",
      isDefault: true,
      maskedCredentialHint: "sk-...1234",
    });

    const prisma = await createTestPrisma();
    const storedCredential = await prisma.providerCredential.findFirstOrThrow();
    expect(storedCredential.encryptedSecret).not.toContain("sk-live-primary-1234");
    expect(storedCredential.secretHint).toBe("sk-...1234");
    await prisma.$disconnect();

    const secondCreate = await request(app.getHttpServer())
      .post("/v1/provider-connections/api-key")
      .send({
        provider: "openai",
        displayName: "Backup OpenAI",
        apiKey: "sk-live-backup-5678",
        makeDefault: true,
      })
      .expect(201);

    expect(secondCreate.body.connection).toMatchObject({
      displayName: "Backup OpenAI",
      isDefault: true,
      maskedCredentialHint: "sk-...5678",
    });

    const listResponse = await request(app.getHttpServer())
      .get("/v1/provider-connections")
      .expect(200);

    expect(listResponse.body.connections).toHaveLength(2);
    expect(
      listResponse.body.connections.filter((connection: { isDefault: boolean }) => connection.isDefault)
    ).toHaveLength(1);
    expect(listResponse.body.connections[0].id).toBe(secondCreate.body.connection.id);

    await closeTrackedApp(app);
  }, 15_000);

  it("rejects API keys that trim down to empty content", async () => {
    const app = await createAuthorizedApp(TEST_USER);

    const response = await request(app.getHttpServer())
      .post("/v1/provider-connections/api-key")
      .send({
        provider: "openai",
        apiKey: "   ",
      })
      .expect(400);

    expect(response.body.message).toContain("API key must not be empty");

    const listResponse = await request(app.getHttpServer())
      .get("/v1/provider-connections")
      .expect(200);

    expect(listResponse.body.connections).toEqual([]);

    await closeTrackedApp(app);
  }, 15_000);

  it("supports the internal allowlisted provider-account flow for OpenAI", async () => {
    process.env.OPENAI_PROVIDER_ACCOUNT_ALLOWLIST = TEST_USER.email;
    const app = await createAuthorizedApp(TEST_USER);
    const agent = request.agent(app.getHttpServer());

    const started = await agent
      .post("/v1/provider-connections/provider-account/start")
      .send({
        provider: "openai",
        displayName: "Internal OpenAI",
        makeDefault: true,
      })
      .expect(201);

    expect(started.body).toMatchObject({
      provider: "openai",
      flow: "internal_allowlisted",
    });
    expect(started.body.challengeToken).toEqual(expect.any(String));

    const completed = await agent
      .post("/v1/provider-connections/provider-account/complete")
      .send({
        provider: "openai",
        challengeToken: started.body.challengeToken,
      })
      .expect(201);

    expect(completed.body.connection).toMatchObject({
      provider: "openai",
      credentialMode: "provider_account",
      status: "active",
      displayName: "Internal OpenAI",
      isDefault: true,
      maskedCredentialHint: null,
    });

    const replayComplete = await agent
      .post("/v1/provider-connections/provider-account/complete")
      .send({
        provider: "openai",
        challengeToken: started.body.challengeToken,
      })
      .expect(400);

    expect(replayComplete.body.message).toContain("missing");

    await closeTrackedApp(app);
  }, 15_000);

  it("auto-defaults the first provider-account connection when makeDefault is omitted", async () => {
    process.env.OPENAI_PROVIDER_ACCOUNT_ALLOWLIST = TEST_USER.email;
    const app = await createAuthorizedApp(TEST_USER);
    const agent = request.agent(app.getHttpServer());

    const started = await agent
      .post("/v1/provider-connections/provider-account/start")
      .send({
        provider: "openai",
        displayName: "Implicit Default OpenAI",
      })
      .expect(201);

    const completed = await agent
      .post("/v1/provider-connections/provider-account/complete")
      .send({
        provider: "openai",
        challengeToken: started.body.challengeToken,
      })
      .expect(201);

    expect(completed.body.connection).toMatchObject({
      displayName: "Implicit Default OpenAI",
      isDefault: true,
    });

    await closeTrackedApp(app);
  }, 15_000);

  it("blocks provider-account mode for non-allowlisted users and enforces owner scoping on update/delete", async () => {
    const app = await createAuthorizedApp(TEST_USER);

    await request(app.getHttpServer())
      .post("/v1/provider-connections/provider-account/start")
      .send({
        provider: "openai",
      })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post("/v1/provider-connections/api-key")
      .send({
        provider: "openai",
        apiKey: "sk-shared-9876",
      })
      .expect(201);

    await closeTrackedApp(app);

    const otherUserApp = await createAuthorizedApp(OTHER_TEST_USER);

    await request(otherUserApp.getHttpServer())
      .patch(`/v1/provider-connections/${created.body.connection.id}`)
      .send({
        displayName: "Not yours",
      })
      .expect(404);

    await request(otherUserApp.getHttpServer())
      .delete(`/v1/provider-connections/${created.body.connection.id}`)
      .expect(404);

    await closeTrackedApp(otherUserApp);

    const ownerApp = await createAuthorizedApp(TEST_USER);

    const updated = await request(ownerApp.getHttpServer())
      .patch(`/v1/provider-connections/${created.body.connection.id}`)
      .send({
        displayName: "Renamed OpenAI",
      })
      .expect(200);

    expect(updated.body.connection.displayName).toBe("Renamed OpenAI");

    await request(ownerApp.getHttpServer())
      .delete(`/v1/provider-connections/${created.body.connection.id}`)
      .expect(200, { success: true });

    const listAfterDelete = await request(ownerApp.getHttpServer())
      .get("/v1/provider-connections")
      .expect(200);

    expect(listAfterDelete.body.connections).toEqual([]);

    await closeTrackedApp(ownerApp);
  }, 15_000);
});
