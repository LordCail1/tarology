import { ConflictException } from "@nestjs/common";
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

const deckCatalog = {
  requireDeck: vi.fn().mockResolvedValue({
    summary: {
      id: "thoth",
      name: "Thoth Tarot",
      description: "Deck",
      specVersion: "thoth-v1",
      previewImageUrl: "/images/cards/thoth/TheSun.jpg",
      backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
      cardCount: 78,
    },
    spec: THOTH_DECK_SPEC,
  }),
};

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
    deckCatalog as never,
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
        deckId: "thoth",
        deckSpecVersion: "thoth-v1",
      },
      "create-reading-explicit"
    );

    expect(result.created).toBe(true);
    expect(result.response.deckId).toBe("thoth");
    expect(result.response.deckSpecVersion).toBe("thoth-v1");
    expect(result.response.assignments).toHaveLength(78);
    expect(new Set(result.response.assignments.map((assignment) => assignment.cardId)).size).toBe(
      78
    );
    expect(result.response.canvasMode).toBe("freeform");
    expect(result.response.status).toBe("active");
    expect(result.response.version).toBe(1);
    expect(readingsRepository.create).toHaveBeenCalledOnce();
    expect(readingIdempotencyRepository.createCreateReceipt).toHaveBeenCalledOnce();
  });

  it("falls back to the saved default deck when no explicit deck is passed", async () => {
    const { prisma, service } = createService("thoth");

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
    expect(result.response.deckId).toBe("thoth");
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
});
