import { ConflictException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser, ReadingDetail } from "@tarology/shared";
import { ReadingsService } from "../src/reading-studio/readings.service.js";
import { applyReadingEvent } from "../src/reading-studio/domain/reading-projector.js";
import { THOTH_DECK_SPEC } from "../src/reading-studio/domain/thoth-deck-spec.js";

const user: AuthenticatedUser = {
  userId: "persisted-user-1",
  provider: "google",
  providerSubject: "sub-1",
  email: "reader@example.com",
  displayName: "Reader",
  avatarUrl: null,
};

const decksService = {
  requireDeckForReading: vi.fn().mockResolvedValue({
    summary: {
      id: "deck_thoth_owned",
      name: "Thoth Tarot",
      description: "Deck",
      specVersion: "thoth-v1",
      knowledgeVersion: 1,
      initializationMode: "starter_content" as const,
      initializerKey: "thoth",
      previewImageUrl: "/images/cards/thoth/TheSun.jpg",
      backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
      cardCount: 78,
      symbolCount: 8,
    },
    cardIds: [...THOTH_DECK_SPEC.cardIds],
  }),
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableStringify(
            (value as Record<string, unknown>)[key]
          )}`
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashRequest(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function createService(defaultDeckId: string | null) {
  const prisma = {
    userPreference: {
      findUnique: vi.fn().mockResolvedValue({ defaultDeckId }),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => callback({})),
  };

  const readingsRepository = {
    create: vi.fn().mockResolvedValue(undefined),
  };
  const readingEventsRepository = {
    append: vi.fn().mockResolvedValue(undefined),
  };
  const readingSnapshotsRepository = {
    create: vi.fn().mockResolvedValue(undefined),
  };
  const readingIdempotencyRepository = {
    findCreateReceipt: vi.fn().mockResolvedValue(null),
    createCreateReceipt: vi.fn().mockResolvedValue(undefined),
    findCommandReceiptByIdempotencyKey: vi.fn(),
    findCommandReceiptByCommandId: vi.fn(),
    createCommandReceipt: vi.fn(),
  };

  const service = new ReadingsService(
    prisma as never,
    decksService as never,
    readingsRepository as never,
    readingEventsRepository as never,
    readingSnapshotsRepository as never,
    readingIdempotencyRepository as never
  );

  return {
    prisma,
    readingsRepository,
    readingEventsRepository,
    readingSnapshotsRepository,
    readingIdempotencyRepository,
    service,
  };
}

function buildReadingDetail(overrides: Partial<ReadingDetail> = {}): ReadingDetail {
  return {
    readingId: "reading-1",
    rootQuestion: "What should I focus on next?",
    deckId: "deck_thoth_owned",
    deckSpecVersion: "thoth-v1",
    cardCount: 1,
    status: "active",
    version: 1,
    shuffleAlgorithmVersion: "tarology-shuffle-v1",
    seedCommitment: "seed-commitment",
    orderHash: "order-hash",
    assignments: [
      {
        deckIndex: 0,
        cardId: "card-1",
        assignedReversal: false,
      },
    ],
    canvas: {
      cards: [
        {
          deckIndex: 0,
          cardId: "card-1",
          assignedReversal: false,
          isFaceUp: false,
          rotationDeg: 0,
          freeform: {
            xPx: 96,
            yPx: 144,
            stackOrder: 1,
          },
        },
      ],
    },
    createdAt: "2026-03-22T10:00:00.000Z",
    updatedAt: "2026-03-22T10:00:00.000Z",
    archivedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

describe("ReadingsService", () => {
  it("creates a reading from an explicit deck id", async () => {
    const { service, readingsRepository, readingIdempotencyRepository } = createService(null);

    const result = await service.createReading(
      user,
      {
        rootQuestion: "What should I focus on?",
        deckId: "deck_thoth_owned",
        deckSpecVersion: "thoth-v1",
      },
      "create-reading-explicit"
    );

    expect(result.created).toBe(true);
    expect(result.response.deckId).toBe("deck_thoth_owned");
    expect(result.response.deckSpecVersion).toBe("thoth-v1");
    expect(result.response.assignments).toHaveLength(78);
    expect(new Set(result.response.assignments.map((assignment) => assignment.cardId)).size).toBe(
      78
    );
    expect(result.response.status).toBe("active");
    expect(result.response.version).toBe(1);
    expect(readingsRepository.create).toHaveBeenCalledOnce();
    expect(readingIdempotencyRepository.createCreateReceipt).toHaveBeenCalledOnce();
  });

  it("falls back to the saved default deck when no explicit deck is passed", async () => {
    const { prisma, service } = createService("deck_thoth_owned");

    const result = await service.createReading(
      user,
      {
        rootQuestion: "What should I focus on?",
        deckSpecVersion: "thoth-v1",
      },
      "create-reading-default-deck"
    );

    expect(prisma.userPreference.findUnique).toHaveBeenCalledWith({
      where: { userId: user.userId },
      select: { defaultDeckId: true },
    });
    expect(result.response.deckId).toBe("deck_thoth_owned");
  });

  it("returns a conflict when there is no explicit or saved default deck", async () => {
    const { service } = createService(null);

    await expect(
      service.createReading(
        user,
        {
          rootQuestion: "What should I focus on?",
          deckSpecVersion: "thoth-v1",
        },
        "create-reading-no-default"
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("replays a duplicate command receipt that appears after a concurrent version race", async () => {
    const commandPayload = {
      commandId: "2f04d73c-f319-4b73-a188-c04c862104ab",
      expectedVersion: 1,
      type: "archive_reading" as const,
      payload: {},
    };
    const readingRecord = {
      id: "reading-1",
      ownerUserId: user.userId,
      rootQuestion: "What remains idempotent?",
      deckId: "deck_thoth_owned",
      deckSpecVersion: "thoth-v1",
      shuffleAlgorithmVersion: "tarology-shuffle-v1",
      seedCommitment: "seed-commitment",
      orderHash: "order-hash",
      status: "active",
      version: 1,
      createdAt: new Date("2026-03-13T00:00:00.000Z"),
      updatedAt: new Date("2026-03-13T00:00:00.000Z"),
      archivedAt: null,
      deletedAt: null,
      cards: [],
    };
    const replayResponse = {
      reading: {
        readingId: readingRecord.id,
        rootQuestion: readingRecord.rootQuestion,
        deckId: readingRecord.deckId,
        deckSpecVersion: readingRecord.deckSpecVersion,
        shuffleAlgorithmVersion: readingRecord.shuffleAlgorithmVersion,
        seedCommitment: readingRecord.seedCommitment,
        orderHash: readingRecord.orderHash,
        status: "archived" as const,
        version: 2,
        createdAt: readingRecord.createdAt.toISOString(),
        updatedAt: "2026-03-13T00:01:00.000Z",
        archivedAt: "2026-03-13T00:01:00.000Z",
        deletedAt: null,
        assignments: [],
      },
    };
    const requestHash = hashRequest({
      readingId: readingRecord.id,
      command: commandPayload,
    });
    const readingsRepository = {
      findOwnedById: vi.fn().mockResolvedValue(readingRecord),
      updateLifecycle: vi.fn().mockResolvedValue(0),
      findCurrentVersion: vi.fn(),
    };
    const readingIdempotencyRepository = {
      findCreateReceipt: vi.fn(),
      createCreateReceipt: vi.fn(),
      findCommandReceiptByIdempotencyKey: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          requestHash,
          responseJson: replayResponse,
        }),
      findCommandReceiptByCommandId: vi.fn().mockResolvedValue(null),
      createCommandReceipt: vi.fn(),
    };
    const service = new ReadingsService(
      {
        userPreference: {
          findUnique: vi.fn(),
        },
        $transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => callback({})),
      } as never,
      decksService as never,
      readingsRepository as never,
      {
        append: vi.fn(),
        listAfterVersion: vi.fn().mockResolvedValue([]),
      } as never,
      {
        create: vi.fn(),
        findLatest: vi.fn().mockResolvedValue({
          version: 1,
          projection: buildReadingDetail({
            readingId: readingRecord.id,
            rootQuestion: readingRecord.rootQuestion,
            deckId: readingRecord.deckId,
            deckSpecVersion: readingRecord.deckSpecVersion,
            shuffleAlgorithmVersion: readingRecord.shuffleAlgorithmVersion,
            seedCommitment: readingRecord.seedCommitment,
            orderHash: readingRecord.orderHash,
            version: 1,
            createdAt: readingRecord.createdAt.toISOString(),
            updatedAt: readingRecord.updatedAt.toISOString(),
          }),
        }),
      } as never,
      readingIdempotencyRepository as never
    );

    const result = await service.applyCommand(
      user,
      readingRecord.id,
      "archive-command",
      commandPayload
    );

    expect(result).toEqual(replayResponse);
    expect(readingsRepository.findCurrentVersion).not.toHaveBeenCalled();
    expect(readingIdempotencyRepository.findCommandReceiptByIdempotencyKey).toHaveBeenCalledTimes(2);
  });

  it("normalizes legacy grid snapshots during restore while preserving rollout compatibility fields", async () => {
    const legacySnapshot = {
      ...buildReadingDetail({
        version: 4,
        updatedAt: "2026-03-22T10:04:00.000Z",
      }),
      canvasMode: "grid",
      canvas: {
        activeMode: "grid",
        cards: [
          {
            deckIndex: 0,
            cardId: "card-1",
            assignedReversal: false,
            isFaceUp: true,
            rotationDeg: 15,
            freeform: {
              xPx: 96,
              yPx: 144,
              stackOrder: 1,
            },
            grid: {
              column: 2,
              row: 1,
            },
          },
        ],
      },
    };

    const service = new ReadingsService(
      {
        userPreference: {
          findUnique: vi.fn(),
        },
      } as never,
      decksService as never,
      {
        findOwnedById: vi.fn().mockResolvedValue({ id: "reading-1" }),
      } as never,
      {
        listAfterVersion: vi.fn().mockResolvedValue([]),
      } as never,
      {
        findLatest: vi.fn().mockResolvedValue({
          version: 4,
          projection: legacySnapshot,
        }),
      } as never,
      {
        findCreateReceipt: vi.fn(),
        createCreateReceipt: vi.fn(),
        findCommandReceiptByIdempotencyKey: vi.fn(),
        findCommandReceiptByCommandId: vi.fn(),
        createCommandReceipt: vi.fn(),
      } as never
    );

    const restored = await service.restoreReadingFromHistory(user.userId, "reading-1");

    expect(restored?.canvas.cards[0].freeform).toEqual({
      xPx: 489,
      yPx: 229,
      stackOrder: 13,
    });
    expect((restored as Record<string, unknown>)?.canvasMode).toBe("grid");
    expect((restored?.canvas as Record<string, unknown>)?.activeMode).toBe("grid");
    expect((restored?.canvas.cards[0] as Record<string, unknown>)?.grid).toEqual({
      column: 2,
      row: 1,
    });
  });

  it("serves legacy grid metadata from restored detail reads", async () => {
    const service = new ReadingsService(
      {
        userPreference: {
          findUnique: vi.fn(),
        },
      } as never,
      decksService as never,
      {
        findOwnedById: vi.fn().mockResolvedValue({ id: "reading-1", deletedAt: null }),
      } as never,
      {
        listAfterVersion: vi.fn().mockResolvedValue([]),
      } as never,
      {
        findLatest: vi.fn().mockResolvedValue({
          version: 3,
          projection: {
            ...buildReadingDetail({
              version: 3,
              updatedAt: "2026-03-22T10:03:00.000Z",
            }),
            canvasMode: "freeform",
            canvas: {
              activeMode: "freeform",
              cards: [
                {
                  deckIndex: 0,
                  cardId: "card-1",
                  assignedReversal: false,
                  isFaceUp: false,
                  rotationDeg: 0,
                  freeform: {
                    xPx: 96,
                    yPx: 144,
                    stackOrder: 1,
                  },
                  grid: {
                    column: 3,
                    row: 2,
                  },
                },
              ],
            },
          },
        }),
      } as never,
      {
        findCreateReceipt: vi.fn(),
        createCreateReceipt: vi.fn(),
        findCommandReceiptByIdempotencyKey: vi.fn(),
        findCommandReceiptByCommandId: vi.fn(),
        createCommandReceipt: vi.fn(),
      } as never
    );

    const detail = await service.getReading(user, "reading-1");

    expect(detail.version).toBe(3);
    expect((detail as Record<string, unknown>).canvasMode).toBe("freeform");
    expect((detail.canvas as Record<string, unknown>).activeMode).toBe("freeform");
    expect((detail.canvas.cards[0] as Record<string, unknown>).grid).toEqual({
      column: 3,
      row: 2,
    });
  });

  it("preserves freeform coordinates after a shimmed legacy grid toggle", async () => {
    const service = new ReadingsService(
      {
        userPreference: {
          findUnique: vi.fn(),
        },
      } as never,
      decksService as never,
      {
        findOwnedById: vi.fn().mockResolvedValue({ id: "reading-1", deletedAt: null }),
      } as never,
      {
        listAfterVersion: vi.fn().mockResolvedValue([]),
      } as never,
      {
        findLatest: vi.fn().mockResolvedValue({
          version: 3,
          projection: {
            ...buildReadingDetail({
              version: 3,
              updatedAt: "2026-03-22T10:03:00.000Z",
            }),
            canvasMode: "grid",
            canvas: {
              activeMode: "grid",
              cards: [
                {
                  deckIndex: 0,
                  cardId: "card-1",
                  assignedReversal: false,
                  isFaceUp: false,
                  rotationDeg: 0,
                  freeform: {
                    xPx: 377,
                    yPx: 241,
                    stackOrder: 7,
                  },
                  grid: {
                    column: 2,
                    row: 1,
                  },
                },
              ],
            },
            __legacyCanvasModeShim: "preserve_freeform",
          },
        }),
      } as never,
      {
        findCreateReceipt: vi.fn(),
        createCreateReceipt: vi.fn(),
        findCommandReceiptByIdempotencyKey: vi.fn(),
        findCommandReceiptByCommandId: vi.fn(),
        createCommandReceipt: vi.fn(),
      } as never
    );

    const restored = await service.restoreReadingFromHistory(user.userId, "reading-1");
    const detail = await service.getReading(user, "reading-1");

    expect(restored?.canvas.cards[0].freeform).toEqual({
      xPx: 377,
      yPx: 241,
      stackOrder: 7,
    });
    expect(detail.canvas.cards[0].freeform).toEqual({
      xPx: 377,
      yPx: 241,
      stackOrder: 7,
    });
    expect((detail as Record<string, unknown>).__legacyCanvasModeShim).toBeUndefined();
  });

  it("clears legacy grid compatibility after a later freeform move", () => {
    const current = {
      ...buildReadingDetail({
        version: 2,
        updatedAt: "2026-03-22T10:02:00.000Z",
      }),
      canvasMode: "grid",
      canvas: {
        activeMode: "grid",
        cards: [
          {
            deckIndex: 0,
            cardId: "card-1",
            assignedReversal: false,
            isFaceUp: false,
            rotationDeg: 0,
            freeform: {
              xPx: 377,
              yPx: 241,
              stackOrder: 7,
            },
            grid: {
              column: 2,
              row: 1,
            },
          },
        ],
      },
      __legacyCanvasModeShim: "preserve_freeform",
    } as unknown as ReadingDetail;

    const moved = applyReadingEvent(current, {
      eventType: "reading.card_moved",
      version: 3,
      payload: {
        cardId: "card-1",
        version: 3,
        updatedAt: "2026-03-22T10:03:00.000Z",
        freeform: {
          xPx: 450,
          yPx: 300,
          stackOrder: 8,
        },
      },
    });

    expect((moved as Record<string, unknown>).canvasMode).toBe("freeform");
    expect((moved.canvas as Record<string, unknown>).activeMode).toBe("freeform");
    expect((moved as Record<string, unknown>).__legacyCanvasModeShim).toBeUndefined();
    expect(moved.canvas.cards[0].freeform).toEqual({
      xPx: 450,
      yPx: 300,
      stackOrder: 8,
    });
  });

  it("replays legacy grid-only move events during restore", async () => {
    const service = new ReadingsService(
      {
        userPreference: {
          findUnique: vi.fn(),
        },
      } as never,
      decksService as never,
      {
        findOwnedById: vi.fn().mockResolvedValue({ id: "reading-1" }),
      } as never,
      {
        listAfterVersion: vi.fn().mockResolvedValue([
          {
            eventType: "reading.card_moved",
            version: 2,
            payload: {
              cardId: "card-1",
              version: 2,
              updatedAt: "2026-03-22T10:02:00.000Z",
              grid: {
                column: 3,
                row: 2,
              },
            },
          },
        ]),
      } as never,
      {
        findLatest: vi.fn().mockResolvedValue({
          version: 1,
          projection: buildReadingDetail(),
        }),
      } as never,
      {
        findCreateReceipt: vi.fn(),
        createCreateReceipt: vi.fn(),
        findCommandReceiptByIdempotencyKey: vi.fn(),
        findCommandReceiptByCommandId: vi.fn(),
        createCommandReceipt: vi.fn(),
      } as never
    );

    const restored = await service.restoreReadingFromHistory(user.userId, "reading-1");

    expect(restored?.version).toBe(2);
    expect(restored?.updatedAt).toBe("2026-03-22T10:02:00.000Z");
    expect((restored as Record<string, unknown>)?.canvasMode).toBe("freeform");
    expect((restored?.canvas as Record<string, unknown>)?.activeMode).toBe("freeform");
    expect(restored?.canvas.cards[0].freeform).toEqual({
      xPx: 720,
      yPx: 429,
      stackOrder: 24,
    });
  });
});
