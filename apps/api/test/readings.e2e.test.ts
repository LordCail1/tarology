import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { ExecutionContext, INestApplication } from "@nestjs/common";
import request from "supertest";
import type { AuthenticatedUser, ReadingCommandResponse } from "@tarology/shared";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/bootstrap.js";
import { SessionAuthGuard } from "../src/identity/session-auth.guard.js";
import { ReadingsService } from "../src/reading-studio/readings.service.js";
import {
  OTHER_TEST_USER,
  TEST_USER,
  configureApiTestEnvironment,
  createTestPrisma,
  ensureOwnedStarterDeck,
  ensureThothDeck,
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
let testUserDeckId = "";
let otherUserDeckId = "";

async function closeTrackedApp(app: INestApplication): Promise<void> {
  const index = openApps.indexOf(app);
  if (index >= 0) {
    openApps.splice(index, 1);
  }

  await app.close();
}

describe("Reading durability and history API", () => {
  beforeAll(async () => {
    configureApiTestEnvironment();
  });

  beforeEach(async () => {
    const prisma = await createTestPrisma();
    await resetDatabase(prisma);
    await ensureThothDeck(prisma);
    testUserDeckId = await ensureOwnedStarterDeck(prisma, TEST_USER);
    otherUserDeckId = await ensureOwnedStarterDeck(prisma, OTHER_TEST_USER);
    await prisma.$disconnect();
  });

  afterEach(async () => {
    while (openApps.length > 0) {
      const app = openApps.pop();
      if (app) {
        await app.close();
      }
    }
  });

  it("persists a created reading across app restarts", async () => {
    const firstApp = await createAuthorizedApp(TEST_USER);

    const createResponse = await request(firstApp.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "create-persisted-reading")
      .send({
        rootQuestion: "What continues after a reset?",
        deckId: testUserDeckId,
        deckSpecVersion: "thoth-v1",
        canvasMode: "grid",
      })
      .expect(201);

    await closeTrackedApp(firstApp);

    const secondApp = await createAuthorizedApp(TEST_USER);

    const detailResponse = await request(secondApp.getHttpServer())
      .get(`/v1/readings/${createResponse.body.readingId}`)
      .expect(200);

    expect(detailResponse.body).toMatchObject({
      readingId: createResponse.body.readingId,
      rootQuestion: "What continues after a reset?",
      deckId: testUserDeckId,
      deckSpecVersion: "thoth-v1",
      status: "active",
      version: 1,
      archivedAt: null,
      deletedAt: null,
    });
    expect(createResponse.body.canvasMode).toBe("freeform");
    expect(detailResponse.body.canvasMode).toBe("freeform");
    expect(createResponse.body.canvas.activeMode).toBe("freeform");
    expect(detailResponse.body.canvas.activeMode).toBe("freeform");
    expect(createResponse.body.canvas.cards[0].grid).toMatchObject({
      column: expect.any(Number),
      row: expect.any(Number),
    });
    expect(detailResponse.body.canvas.cards[0].grid).toMatchObject({
      column: expect.any(Number),
      row: expect.any(Number),
    });
    expect(detailResponse.body.assignments).toHaveLength(78);
    expect(detailResponse.body.assignments).toEqual(createResponse.body.assignments);

    await closeTrackedApp(secondApp);
  });

  it("replays create idempotency and rejects mismatched payloads", async () => {
    const app = await createAuthorizedApp(TEST_USER);

    const requestBody = {
      rootQuestion: "What should stay stable?",
      deckId: testUserDeckId,
      deckSpecVersion: "thoth-v1",
    };

    const first = await request(app.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "reading-create-replay")
      .send(requestBody)
      .expect(201);

    const replay = await request(app.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "reading-create-replay")
      .send(requestBody)
      .expect(200);

    expect(replay.body).toEqual(first.body);

    const conflict = await request(app.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "reading-create-replay")
      .send({
        ...requestBody,
        rootQuestion: "What should not silently change?",
      })
      .expect(409);

    expect(conflict.body).toMatchObject({
      code: "idempotency_conflict",
    });

    await closeTrackedApp(app);
  });

  it("lists readings by owner in descending updated order", async () => {
    const app = await createAuthorizedApp(TEST_USER);

    const first = await request(app.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "first-reading")
      .send({
        rootQuestion: "First reading",
        deckId: testUserDeckId,
        deckSpecVersion: "thoth-v1",
      })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "second-reading")
      .send({
        rootQuestion: "Second reading",
        deckId: testUserDeckId,
        deckSpecVersion: "thoth-v1",
      })
      .expect(201);

    await closeTrackedApp(app);

    const otherUserApp = await createAuthorizedApp(OTHER_TEST_USER);

    await request(otherUserApp.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "other-user-reading")
      .send({
        rootQuestion: "Other user reading",
        deckId: otherUserDeckId,
        deckSpecVersion: "thoth-v1",
      })
      .expect(201);

    await closeTrackedApp(otherUserApp);

    const listApp = await createAuthorizedApp(TEST_USER);

    const listResponse = await request(listApp.getHttpServer()).get("/v1/readings").expect(200);

    expect(listResponse.body.readings.map((reading: { readingId: string }) => reading.readingId)).toEqual([
      second.body.readingId,
      first.body.readingId,
    ]);
    expect(listResponse.body.readings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          readingId: first.body.readingId,
          canvasMode: "freeform",
        }),
        expect.objectContaining({
          readingId: second.body.readingId,
          canvasMode: "freeform",
        }),
      ])
    );

    await closeTrackedApp(listApp);
  });

  it("archives, reopens, and restores from snapshot plus events", async () => {
    const app = await createAuthorizedApp(TEST_USER);

    const created = await request(app.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "archive-reopen-reading")
      .send({
        rootQuestion: "How does this evolve?",
        deckId: testUserDeckId,
        deckSpecVersion: "thoth-v1",
      })
      .expect(201);

    const archived = await request(app.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "archive-command")
      .send({
        commandId: "c5bdf180-ef74-49ff-bd7b-f92c0cf6b2d8",
        expectedVersion: 1,
        type: "archive_reading",
        payload: {},
      })
      .expect(200);

    expect(archived.body).toMatchObject({
      reading: {
        status: "archived",
        version: 2,
      },
    });
    expect(archived.body.reading.archivedAt).not.toBeNull();

    const reopened = await request(app.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "reopen-command")
      .send({
        commandId: "d2522409-a14e-4dd7-bff0-087a4321af1b",
        expectedVersion: 2,
        type: "reopen_reading",
        payload: {},
      })
      .expect(200);

    expect(reopened.body).toMatchObject({
      reading: {
        status: "active",
        version: 3,
        archivedAt: null,
      },
    });

    const restored = await app
      .get(ReadingsService)
      .restoreReadingFromHistory(TEST_USER.userId, created.body.readingId);

    expect(restored).toEqual(reopened.body.reading);

    const detail = await request(app.getHttpServer())
      .get(`/v1/readings/${created.body.readingId}`)
      .expect(200);

    expect(detail.body).toEqual(reopened.body.reading);

    await closeTrackedApp(app);
  });

  it("persists canvas commands and restores the updated workspace state", async () => {
    const app = await createAuthorizedApp(TEST_USER);

    const created = await request(app.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "canvas-commands-create")
      .send({
        rootQuestion: "How does the workspace evolve?",
        deckId: testUserDeckId,
        deckSpecVersion: "thoth-v1",
      })
      .expect(201);

    const targetCardId = created.body.canvas.cards[0].cardId as string;

    const moved = await request(app.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "canvas-card-move")
      .send({
        commandId: "edb75f6e-a3f9-42db-8659-351a1110f413",
        expectedVersion: 1,
        type: "move_card",
        payload: {
          cardId: targetCardId,
          freeform: {
            xPx: 420,
            yPx: 210,
          },
        },
      })
      .expect(200);

    expect(
      moved.body.reading.canvas.cards.find((card: { cardId: string }) => card.cardId === targetCardId)
    ).toMatchObject({
      cardId: targetCardId,
      freeform: {
        xPx: 420,
        yPx: 210,
      },
    });

    const rotated = await request(app.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "canvas-card-rotate")
      .send({
        commandId: "2680a949-f4ff-48eb-a592-dad687518b76",
        expectedVersion: 2,
        type: "rotate_card",
        payload: {
          cardId: targetCardId,
          deltaDeg: 47,
        },
      })
      .expect(200);

    expect(
      rotated.body.reading.canvas.cards.find(
        (card: { cardId: string; rotationDeg: number }) => card.cardId === targetCardId
      )
    ).toMatchObject({
      cardId: targetCardId,
      rotationDeg: 47,
    });

    const flipped = await request(app.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "canvas-card-flip")
      .send({
        commandId: "4654cbf5-c00c-42bf-be0a-d0f33458dfe4",
        expectedVersion: 3,
        type: "flip_card",
        payload: {
          cardId: targetCardId,
        },
      })
      .expect(200);

    expect(
      flipped.body.reading.canvas.cards.find(
        (card: { cardId: string; isFaceUp: boolean }) => card.cardId === targetCardId
      )
    ).toMatchObject({
      cardId: targetCardId,
      isFaceUp: true,
    });

    expect(
      flipped.body.reading.canvas.cards.find(
        (card: {
          cardId: string;
          freeform: { xPx: number; yPx: number; stackOrder: number };
          isFaceUp: boolean;
          rotationDeg: number;
        }) => card.cardId === targetCardId
      )
    ).toMatchObject({
      cardId: targetCardId,
      freeform: {
        xPx: 420,
        yPx: 210,
      },
      isFaceUp: true,
      rotationDeg: 47,
    });

    const restored = await app
      .get(ReadingsService)
      .restoreReadingFromHistory(TEST_USER.userId, created.body.readingId);

    expect(restored).toEqual(flipped.body.reading);

    const detail = await request(app.getHttpServer())
      .get(`/v1/readings/${created.body.readingId}`)
      .expect(200);

    expect(detail.body).toEqual(flipped.body.reading);

    await closeTrackedApp(app);
  });

  it("accepts stale grid-era canvas commands during rollout", async () => {
    const app = await createAuthorizedApp(TEST_USER);

    const created = await request(app.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "legacy-canvas-command-create")
      .send({
        rootQuestion: "Can old clients survive the rollout?",
        deckId: testUserDeckId,
        deckSpecVersion: "thoth-v1",
      })
      .expect(201);

    const targetCardId = created.body.canvas.cards[0].cardId as string;
    const targetCardBeforeSwitch = created.body.canvas.cards.find(
      (card: { cardId: string }) => card.cardId === targetCardId
    );

    const switched = await request(app.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "legacy-switch-mode")
      .send({
        commandId: "6b6dfde2-5988-4ec2-8ef9-5422ae4ae8a4",
        expectedVersion: 1,
        type: "switch_canvas_mode",
        payload: {
          canvasMode: "grid",
        },
      })
      .expect(200);

    expect(switched.body.reading.version).toBe(2);
    expect(switched.body.reading.canvasMode).toBe("grid");
    expect(switched.body.reading.canvas.activeMode).toBe("grid");
    expect(
      switched.body.reading.canvas.cards.find((card: { cardId: string }) => card.cardId === targetCardId)
    ).toMatchObject({
      cardId: targetCardId,
      freeform: targetCardBeforeSwitch?.freeform,
    });

    const switchedDetail = await request(app.getHttpServer())
      .get(`/v1/readings/${created.body.readingId}`)
      .expect(200);

    expect(switchedDetail.body.readingId).toBe(created.body.readingId);
    expect(switchedDetail.body.version).toBe(2);
    expect(switchedDetail.body.canvasMode).toBe("grid");
    expect(switchedDetail.body.canvas.activeMode).toBe("grid");

    const moved = await request(app.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "legacy-grid-move")
      .send({
        commandId: "160295eb-3cf9-492f-a12b-3d783f11a2c1",
        expectedVersion: 2,
        type: "move_card",
        payload: {
          cardId: targetCardId,
          grid: {
            column: 2,
            row: 1,
          },
        },
      })
      .expect(200);

    expect(moved.body.reading.version).toBe(3);
    expect(
      moved.body.reading.canvas.cards.find((card: { cardId: string }) => card.cardId === targetCardId)
    ).toMatchObject({
      cardId: targetCardId,
      freeform: {
        xPx: 489,
        yPx: 229,
      },
      grid: {
        column: 2,
        row: 1,
      },
    });

    await closeTrackedApp(app);
  });

  it("returns 404 when a canvas command targets a card outside the reading", async () => {
    const app = await createAuthorizedApp(TEST_USER);

    const created = await request(app.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "missing-card-create")
      .send({
        rootQuestion: "What happens when the card is missing?",
        deckId: testUserDeckId,
        deckSpecVersion: "thoth-v1",
      })
      .expect(201);

    const commandResponse = await request(app.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "missing-card-command")
      .send({
        commandId: "84e6fd09-4ed1-4341-acaf-a5fab4f7432d",
        expectedVersion: 1,
        type: "move_card",
        payload: {
          cardId: "missing-card-id",
          freeform: {
            xPx: 320,
            yPx: 180,
          },
        },
      })
      .expect(404);

    expect(commandResponse.body.message).toContain('Card "missing-card-id" is not part of this reading.');

    const detail = await request(app.getHttpServer())
      .get(`/v1/readings/${created.body.readingId}`)
      .expect(200);

    expect(detail.body.version).toBe(1);

    await closeTrackedApp(app);
  });

  it("rejects stale versions, soft deletes readings, and replays delete commands idempotently", async () => {
    const app = await createAuthorizedApp(TEST_USER);

    const created = await request(app.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "delete-target")
      .send({
        rootQuestion: "What should end cleanly?",
        deckId: testUserDeckId,
        deckSpecVersion: "thoth-v1",
      })
      .expect(201);

    const staleVersion = await request(app.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "stale-archive")
      .send({
        commandId: "16d1d361-aadb-4d3c-9257-0b7f63d4f6a6",
        expectedVersion: 999,
        type: "archive_reading",
        payload: {},
      })
      .expect(409);

    expect(staleVersion.body).toMatchObject({
      code: "version_conflict",
      currentVersion: 1,
    });

    const deleted = await request(app.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "delete-command")
      .send({
        commandId: "90d93ff5-c73c-410a-be07-024ef6975857",
        expectedVersion: 1,
        type: "delete_reading",
        payload: {},
      })
      .expect(200);

    expect(deleted.body).toMatchObject({
      reading: {
        status: "deleted",
        version: 2,
      },
    });
    expect(deleted.body.reading.deletedAt).not.toBeNull();

    await request(app.getHttpServer())
      .get(`/v1/readings/${created.body.readingId}`)
      .expect(404);

    const listAfterDelete = await request(app.getHttpServer()).get("/v1/readings").expect(200);
    expect(listAfterDelete.body.readings).toEqual([]);

    const replayedDelete = await request(app.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "delete-command")
      .send({
        commandId: "90d93ff5-c73c-410a-be07-024ef6975857",
        expectedVersion: 1,
        type: "delete_reading",
        payload: {},
      })
      .expect(200);

    expect(replayedDelete.body).toEqual(deleted.body);

    const commandConflict = await request(app.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "delete-command-conflict")
      .send({
        commandId: "90d93ff5-c73c-410a-be07-024ef6975857",
        expectedVersion: 2,
        type: "delete_reading",
        payload: {},
      })
      .expect(409);

    expect(commandConflict.body).toMatchObject({
      code: "command_conflict",
    });

    await closeTrackedApp(app);
  });

  it("keeps deleted and non-owned readings hidden from normal detail reads", async () => {
    const ownerApp = await createAuthorizedApp(TEST_USER);

    const created = await request(ownerApp.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "private-reading")
      .send({
        rootQuestion: "Who can see this?",
        deckId: testUserDeckId,
        deckSpecVersion: "thoth-v1",
      })
      .expect(201);

    await closeTrackedApp(ownerApp);

    const otherApp = await createAuthorizedApp(OTHER_TEST_USER);

    await request(otherApp.getHttpServer())
      .get(`/v1/readings/${created.body.readingId}`)
      .expect(404);

    await closeTrackedApp(otherApp);
  });

  it("does not replay command receipts for a different user who does not own the reading", async () => {
    const ownerApp = await createAuthorizedApp(TEST_USER);

    const created = await request(ownerApp.getHttpServer())
      .post("/v1/readings")
      .set("Idempotency-Key", "private-command-target")
      .send({
        rootQuestion: "Who should be able to reuse this command?",
        deckId: testUserDeckId,
        deckSpecVersion: "thoth-v1",
      })
      .expect(201);

    const archived = await request(ownerApp.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "private-command-replay")
      .send({
        commandId: "c64a3ac7-b2c3-4f14-959a-1dcb2ea3d7ba",
        expectedVersion: 1,
        type: "archive_reading",
        payload: {},
      })
      .expect(200);

    expect(archived.body).toMatchObject({
      reading: {
        status: "archived",
        version: 2,
      },
    });

    await closeTrackedApp(ownerApp);

    const otherApp = await createAuthorizedApp(OTHER_TEST_USER);

    await request(otherApp.getHttpServer())
      .post(`/v1/readings/${created.body.readingId}/commands`)
      .set("Idempotency-Key", "private-command-replay")
      .send({
        commandId: "c64a3ac7-b2c3-4f14-959a-1dcb2ea3d7ba",
        expectedVersion: 1,
        type: "archive_reading",
        payload: {},
      })
      .expect(404);

    await closeTrackedApp(otherApp);
  });
});
