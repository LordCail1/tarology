import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { DecksService } from "../src/knowledge/decks.service.js";

function createDecksService() {
  const prisma = {
    deck: {
      findFirst: vi.fn(),
    },
    userPreference: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const starterDeckTemplatesService = {
    getStarterDeckSeed: vi.fn(),
    getEmptyTemplateSeed: vi.fn(),
  };

  const service = new DecksService(prisma as never, starterDeckTemplatesService as never);
  return { prisma, starterDeckTemplatesService, service };
}

describe("DecksService", () => {
  it("migrates a legacy shared starter deck into an owned reading deck", async () => {
    const { prisma, starterDeckTemplatesService, service } = createDecksService();

    const ownedDeck = {
      id: "deck_owned_thoth",
      name: "Thoth Tarot",
      description: "Owned starter deck",
      deckSpecVersion: "thoth-v1",
      knowledgeVersion: 1,
      initializationMode: "starter_content",
      initializerKey: "thoth",
      previewImageUrl: "/images/cards/thoth/TheSun.jpg",
      backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
      cardCount: 78,
      _count: { symbols: 8 },
      cards: [{ cardId: "major:the-fool" }, { cardId: "major:the-magician" }],
    };

    const tx = {
      deck: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            id: "thoth",
            name: "Thoth Tarot",
            description: "Legacy shared starter source",
            deckSpecVersion: "thoth-v1",
            knowledgeVersion: 1,
            initializationMode: "starter_content",
            initializerKey: "thoth",
            previewImageUrl: "/images/cards/thoth/TheSun.jpg",
            backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
            cardCount: 78,
            _count: { symbols: 0 },
          })
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(ownedDeck),
      },
      userPreference: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    prisma.deck.findFirst.mockResolvedValueOnce(null);
    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx)
    );

    starterDeckTemplatesService.getStarterDeckSeed.mockReturnValue({
      initializerKey: "thoth",
      initializationMode: "starter_content",
      name: "Thoth Tarot",
      description: "Starter deck",
      deckSpecVersion: "thoth-v1",
      previewImageUrl: "/images/cards/thoth/TheSun.jpg",
      backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
      cards: ownedDeck.cards,
      symbols: [],
      cardSymbols: [],
      knowledgeSources: [],
      cardInformationEntries: [],
      symbolInformationEntries: [],
    });

    vi.spyOn(service as any, "createDeckFromSeed").mockResolvedValue({
      id: "deck_owned_thoth",
    });

    const result = await service.requireDeckForReading(
      "11111111-1111-1111-1111-111111111111",
      "thoth"
    );

    expect(starterDeckTemplatesService.getStarterDeckSeed).toHaveBeenCalledWith("thoth");
    expect(tx.userPreference.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "11111111-1111-1111-1111-111111111111",
        defaultDeckId: "thoth",
      },
      data: {
        defaultDeckId: "deck_owned_thoth",
      },
    });
    expect(result.summary.id).toBe("deck_owned_thoth");
    expect(result.summary.specVersion).toBe("thoth-v1");
    expect(result.cardIds).toEqual(["major:the-fool", "major:the-magician"]);
  });

  it("rejects malformed import payloads before starting a transaction", async () => {
    const { prisma, service } = createDecksService();

    await expect(
      service.importDeck("11111111-1111-1111-1111-111111111111", {
        format: "tarology.deck.export",
        version: 1,
        deck: {},
        symbols: [],
        cardSymbols: [],
        knowledgeSources: [],
        cardInformationEntries: [],
        symbolInformationEntries: [],
      } as any)
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
