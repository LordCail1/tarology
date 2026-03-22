import { ConflictException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@tarology/shared";
import { ReadingsService } from "../src/reading-studio/readings.service.js";
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
      } as never,
      {
        create: vi.fn(),
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
});
