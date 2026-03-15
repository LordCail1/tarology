import { BadRequestException, ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { TOTAL_TAROT_CARDS, type ImportDeckRequest } from "@tarology/shared";
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

function buildValidImportPayload(): ImportDeckRequest {
  return {
    format: "tarology.deck.export",
    version: 1,
    exportedAt: "2026-03-15T00:00:00.000Z",
    deck: {
      name: "Imported Thoth",
      description: "Imported deck payload",
      deckSpecVersion: "thoth-v1",
      knowledgeVersion: 1,
      initializationMode: "starter_content",
      initializerKey: "thoth",
      previewImageUrl: null,
      backImageUrl: null,
      cardCount: TOTAL_TAROT_CARDS,
      originExportDigest: null,
      exportNotes: null,
    },
    cards: Array.from({ length: TOTAL_TAROT_CARDS }, (_, index) => ({
      cardId: `card-${index + 1}`,
      name: `Card ${index + 1}`,
      sortOrder: index,
      shortLabel: null,
      faceImageUrl: null,
      metadataJson: null,
    })),
    symbols: [],
    cardSymbols: [],
    knowledgeSources: [
      {
        id: "source-record-1",
        deckId: "deck-export",
        sourceId: "source-1",
        kind: "starter_content",
        title: "Starter source",
        capturedAt: "2026-03-15T00:00:00.000Z",
        author: null,
        publisher: null,
        url: null,
        citationText: null,
        publishedAt: null,
        rightsNote: null,
        metadataJson: null,
      },
    ],
    cardInformationEntries: [],
    symbolInformationEntries: [],
  };
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

  it("rejects import payloads that do not contain a full tarot roster", async () => {
    const { prisma, service } = createDecksService();
    const payload = buildValidImportPayload();
    payload.cards = payload.cards.slice(0, TOTAL_TAROT_CARDS - 1);
    payload.deck.cardCount = payload.cards.length;

    await expect(
      service.importDeck("11111111-1111-1111-1111-111111111111", payload)
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects imported cards with malformed required fields", async () => {
    const { prisma, service } = createDecksService();
    const payload = buildValidImportPayload();
    payload.cards[0] = {
      ...payload.cards[0],
      cardId: 123 as unknown as string,
    };

    await expect(
      service.importDeck("11111111-1111-1111-1111-111111111111", payload)
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects duplicate knowledge source identifiers in import payloads", async () => {
    const { prisma, service } = createDecksService();
    const payload = buildValidImportPayload();
    payload.knowledgeSources.push({
      ...payload.knowledgeSources[0],
      id: "source-record-2",
    });

    await expect(
      service.importDeck("11111111-1111-1111-1111-111111111111", payload)
    ).rejects.toThrow(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects non-string knowledge source identifiers in import payloads", async () => {
    const { prisma, service } = createDecksService();
    const payload = buildValidImportPayload();
    payload.knowledgeSources = [
      {
        ...payload.knowledgeSources[0],
        sourceId: 123 as unknown as string,
      },
    ];

    await expect(
      service.importDeck("11111111-1111-1111-1111-111111111111", payload)
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects import knowledge sources without a non-empty sourceId", async () => {
    const { prisma, service } = createDecksService();
    const payload = buildValidImportPayload();
    payload.knowledgeSources = [
      {
        ...payload.knowledgeSources[0],
        sourceId: "   ",
      },
    ];

    await expect(
      service.importDeck("11111111-1111-1111-1111-111111111111", payload)
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("stores trimmed knowledge source identifiers during import", async () => {
    const { prisma, service } = createDecksService();
    const payload = buildValidImportPayload();
    payload.knowledgeSources = [
      {
        ...payload.knowledgeSources[0],
        sourceId: " source-1 ",
      },
    ];
    payload.cardInformationEntries = [
      {
        entryId: "entry-card-1",
        cardId: payload.cards[0].cardId,
        label: "core-theme",
        format: "plain_text",
        bodyText: "A note",
        bodyJson: null,
        summary: null,
        tags: [],
        sourceIds: ["source-1"],
        sortOrder: 0,
      },
    ];

    const tx = {
      deck: {
        create: vi.fn(),
      },
      card: {
        createMany: vi.fn(),
        findMany: vi
          .fn()
          .mockResolvedValue(payload.cards.map((card) => ({ id: `card-row-${card.cardId}`, cardId: card.cardId }))),
      },
      knowledgeSource: {
        createMany: vi.fn(),
      },
      symbol: {
        createMany: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      cardInformationEntry: {
        createMany: vi.fn(),
      },
      symbolInformationEntry: {
        createMany: vi.fn(),
      },
      cardSymbol: {
        createMany: vi.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx)
    );

    vi.spyOn(service as any, "requireOwnedDeckSummary").mockResolvedValue({
      id: "deck-imported-1",
      name: "Imported Thoth",
      description: "Imported deck payload",
      deckSpecVersion: "thoth-v1",
      knowledgeVersion: 1,
      initializationMode: "imported_clone",
      initializerKey: "thoth",
      previewImageUrl: null,
      backImageUrl: null,
      cardCount: TOTAL_TAROT_CARDS,
      _count: { symbols: 0 },
    });

    await service.importDeck("11111111-1111-1111-1111-111111111111", payload);

    expect(tx.knowledgeSource.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          sourceId: "source-1",
        }),
      ],
    });
  });

  it("rejects duplicate card-symbol links in import payloads", async () => {
    const { prisma, service } = createDecksService();
    const payload = buildValidImportPayload();
    payload.symbols = [
      {
        symbolId: "symbol-1",
        name: "Lantern",
        shortLabel: null,
        description: null,
        metadataJson: null,
      },
    ];
    payload.cardSymbols = [
      {
        cardId: payload.cards[0].cardId,
        symbolId: "symbol-1",
        sortOrder: 0,
        placementHintJson: null,
        linkNote: null,
      },
      {
        cardId: payload.cards[0].cardId,
        symbolId: "symbol-1",
        sortOrder: 1,
        placementHintJson: null,
        linkNote: null,
      },
    ];

    await expect(
      service.importDeck("11111111-1111-1111-1111-111111111111", payload)
    ).rejects.toThrow(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects duplicate card entry identifiers in import payloads", async () => {
    const { prisma, service } = createDecksService();
    const payload = buildValidImportPayload();
    payload.cardInformationEntries = [
      {
        entryId: "entry-card-1",
        cardId: payload.cards[0].cardId,
        label: "core-theme",
        format: "plain_text",
        bodyText: "First note",
        bodyJson: null,
        summary: null,
        tags: [],
        sourceIds: [],
        sortOrder: 0,
      },
      {
        entryId: "entry-card-1",
        cardId: payload.cards[0].cardId,
        label: "second-note",
        format: "plain_text",
        bodyText: "Second note",
        bodyJson: null,
        summary: null,
        tags: [],
        sourceIds: [],
        sortOrder: 1,
      },
    ];

    await expect(
      service.importDeck("11111111-1111-1111-1111-111111111111", payload)
    ).rejects.toThrow(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects duplicate symbol entry identifiers in import payloads", async () => {
    const { prisma, service } = createDecksService();
    const payload = buildValidImportPayload();
    payload.symbols = [
      {
        symbolId: "symbol-1",
        name: "Lantern",
        shortLabel: null,
        description: null,
        metadataJson: null,
      },
    ];
    payload.symbolInformationEntries = [
      {
        entryId: "entry-symbol-1",
        symbolId: "symbol-1",
        label: "motif",
        format: "plain_text",
        bodyText: "First note",
        bodyJson: null,
        summary: null,
        tags: [],
        sourceIds: [],
        sortOrder: 0,
      },
      {
        entryId: "entry-symbol-1",
        symbolId: "symbol-1",
        label: "motif-2",
        format: "plain_text",
        bodyText: "Second note",
        bodyJson: null,
        summary: null,
        tags: [],
        sourceIds: [],
        sortOrder: 1,
      },
    ];

    await expect(
      service.importDeck("11111111-1111-1111-1111-111111111111", payload)
    ).rejects.toThrow(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects card information entries with malformed sourceIds in import payloads", async () => {
    const { prisma, service } = createDecksService();
    const payload = buildValidImportPayload();
    payload.cardInformationEntries = [
      {
        entryId: "entry-card-1",
        cardId: payload.cards[0].cardId,
        label: "core-theme",
        format: "plain_text",
        bodyText: "A note",
        bodyJson: null,
        summary: null,
        tags: [],
        sourceIds: null as unknown as string[],
        sortOrder: 0,
      },
    ];

    await expect(
      service.importDeck("11111111-1111-1111-1111-111111111111", payload)
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects non-string sourceIds in card entry update flows", async () => {
    const { prisma, service } = createDecksService();

    const tx = {
      knowledgeSource: {
        findMany: vi.fn(),
      },
      cardInformationEntry: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      deck: {
        update: vi.fn(),
      },
      card: {
        update: vi.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx)
    );

    vi.spyOn(service as any, "requireOwnedCardDetail").mockResolvedValue({
      id: "card-record-1",
      deckId: "deck-owned-1",
    });

    await expect(
      service.updateCard("11111111-1111-1111-1111-111111111111", "card-record-1", {
        entries: [
          {
            entryId: "entry-card-update",
            label: "core-theme",
            format: "plain_text",
            bodyText: "A note",
            bodyJson: null,
            summary: null,
            tags: [],
            sourceIds: [123 as unknown as string],
            sortOrder: 0,
          },
        ],
      })
    ).rejects.toThrow(BadRequestException);

    expect(tx.knowledgeSource.findMany).not.toHaveBeenCalled();
    expect(tx.cardInformationEntry.deleteMany).not.toHaveBeenCalled();
    expect(tx.cardInformationEntry.createMany).not.toHaveBeenCalled();
  });

  it("rejects blank sourceIds in card entry update flows", async () => {
    const { prisma, service } = createDecksService();

    const tx = {
      knowledgeSource: {
        findMany: vi.fn(),
      },
      cardInformationEntry: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      deck: {
        update: vi.fn(),
      },
      card: {
        update: vi.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx)
    );

    vi.spyOn(service as any, "requireOwnedCardDetail").mockResolvedValue({
      id: "card-record-1",
      deckId: "deck-owned-1",
    });

    await expect(
      service.updateCard("11111111-1111-1111-1111-111111111111", "card-record-1", {
        entries: [
          {
            entryId: "entry-card-update",
            label: "core-theme",
            format: "plain_text",
            bodyText: "A note",
            bodyJson: null,
            summary: null,
            tags: [],
            sourceIds: ["   "],
            sortOrder: 0,
          },
        ],
      })
    ).rejects.toThrow(BadRequestException);

    expect(tx.knowledgeSource.findMany).not.toHaveBeenCalled();
    expect(tx.cardInformationEntry.deleteMany).not.toHaveBeenCalled();
    expect(tx.cardInformationEntry.createMany).not.toHaveBeenCalled();
  });

  it("rejects non-string entry labels in symbol update flows", async () => {
    const { prisma, service } = createDecksService();

    const tx = {
      knowledgeSource: {
        findMany: vi.fn(),
      },
      symbolInformationEntry: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      deck: {
        update: vi.fn(),
      },
      symbol: {
        update: vi.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx)
    );

    vi.spyOn(service as any, "requireOwnedSymbolDetail").mockResolvedValue({
      id: "symbol-record-1",
      deckId: "deck-owned-1",
    });

    await expect(
      service.updateSymbol("11111111-1111-1111-1111-111111111111", "symbol-record-1", {
        entries: [
          {
            entryId: "entry-symbol-update",
            label: 123 as unknown as string,
            format: "plain_text",
            bodyText: "A note",
            bodyJson: null,
            summary: null,
            tags: [],
            sourceIds: [],
            sortOrder: 0,
          },
        ],
      })
    ).rejects.toThrow(BadRequestException);

    expect(tx.knowledgeSource.findMany).not.toHaveBeenCalled();
    expect(tx.symbolInformationEntry.deleteMany).not.toHaveBeenCalled();
    expect(tx.symbolInformationEntry.createMany).not.toHaveBeenCalled();
  });

  it("rejects symbol information entries with malformed sourceIds in import payloads", async () => {
    const { prisma, service } = createDecksService();
    const payload = buildValidImportPayload();
    payload.symbols = [
      {
        symbolId: "symbol-1",
        name: "Lantern",
        shortLabel: null,
        description: null,
        metadataJson: null,
      },
    ];
    payload.symbolInformationEntries = [
      {
        entryId: "entry-symbol-1",
        symbolId: "symbol-1",
        label: "motif",
        format: "plain_text",
        bodyText: "A note",
        bodyJson: null,
        summary: null,
        tags: [],
        sourceIds: null as unknown as string[],
        sortOrder: 0,
      },
    ];

    await expect(
      service.importDeck("11111111-1111-1111-1111-111111111111", payload)
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects non-string sourceIds in symbol entry update flows", async () => {
    const { prisma, service } = createDecksService();

    const tx = {
      knowledgeSource: {
        findMany: vi.fn(),
      },
      symbolInformationEntry: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      deck: {
        update: vi.fn(),
      },
      symbol: {
        update: vi.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx)
    );

    vi.spyOn(service as any, "requireOwnedSymbolDetail").mockResolvedValue({
      id: "symbol-record-1",
      deckId: "deck-owned-1",
    });

    await expect(
      service.updateSymbol("11111111-1111-1111-1111-111111111111", "symbol-record-1", {
        entries: [
          {
            entryId: "entry-symbol-update",
            label: "motif",
            format: "plain_text",
            bodyText: "A note",
            bodyJson: null,
            summary: null,
            tags: [],
            sourceIds: [123 as unknown as string],
            sortOrder: 0,
          },
        ],
      })
    ).rejects.toThrow(BadRequestException);

    expect(tx.knowledgeSource.findMany).not.toHaveBeenCalled();
    expect(tx.symbolInformationEntry.deleteMany).not.toHaveBeenCalled();
    expect(tx.symbolInformationEntry.createMany).not.toHaveBeenCalled();
  });

  it("rejects duplicate knowledge source identifiers when replacing deck sources", async () => {
    const { prisma, service } = createDecksService();

    const tx = {
      knowledgeSource: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      cardInformationEntry: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      symbolInformationEntry: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      deck: {
        update: vi.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx)
    );

    vi.spyOn(service as any, "requireOwnedDeckSummary").mockResolvedValue({
      id: "deck_owned_thoth",
    });
    vi.spyOn(service as any, "requireOwnedDeckDetail").mockResolvedValue({
      id: "deck_owned_thoth",
    });

    await expect(
      service.updateDeck("11111111-1111-1111-1111-111111111111", "deck_owned_thoth", {
        sources: [
          {
            sourceId: "duplicate-source",
            kind: "starter_content",
            title: "First",
          },
          {
            sourceId: "duplicate-source",
            kind: "manual_reference",
            title: "Second",
          },
        ],
      })
    ).rejects.toThrow(ConflictException);

    expect(tx.knowledgeSource.deleteMany).not.toHaveBeenCalled();
    expect(tx.knowledgeSource.createMany).not.toHaveBeenCalled();
  });

  it("rejects non-string knowledge source identifiers when replacing deck sources", async () => {
    const { prisma, service } = createDecksService();

    const tx = {
      knowledgeSource: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      cardInformationEntry: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      symbolInformationEntry: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      deck: {
        update: vi.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx)
    );

    vi.spyOn(service as any, "requireOwnedDeckSummary").mockResolvedValue({
      id: "deck_owned_thoth",
    });
    vi.spyOn(service as any, "requireOwnedDeckDetail").mockResolvedValue({
      id: "deck_owned_thoth",
    });

    await expect(
      service.updateDeck("11111111-1111-1111-1111-111111111111", "deck_owned_thoth", {
        sources: [
          {
            sourceId: 123 as unknown as string,
            kind: "starter_content",
            title: "Broken source",
          },
        ],
      })
    ).rejects.toThrow(BadRequestException);

    expect(tx.knowledgeSource.deleteMany).not.toHaveBeenCalled();
    expect(tx.knowledgeSource.createMany).not.toHaveBeenCalled();
  });

  it("rejects blank knowledge source identifiers when replacing deck sources", async () => {
    const { prisma, service } = createDecksService();

    const tx = {
      knowledgeSource: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      cardInformationEntry: {
        findMany: vi.fn(),
      },
      symbolInformationEntry: {
        findMany: vi.fn(),
      },
      deck: {
        update: vi.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx)
    );

    vi.spyOn(service as any, "requireOwnedDeckSummary").mockResolvedValue({
      id: "deck_owned_thoth",
    });
    vi.spyOn(service as any, "requireOwnedDeckDetail").mockResolvedValue({
      id: "deck_owned_thoth",
    });

    await expect(
      service.updateDeck("11111111-1111-1111-1111-111111111111", "deck_owned_thoth", {
        sources: [
          {
            sourceId: "   ",
            kind: "starter_content",
            title: "Broken source",
          },
        ],
      })
    ).rejects.toThrow(BadRequestException);

    expect(tx.cardInformationEntry.findMany).not.toHaveBeenCalled();
    expect(tx.symbolInformationEntry.findMany).not.toHaveBeenCalled();
    expect(tx.knowledgeSource.deleteMany).not.toHaveBeenCalled();
    expect(tx.knowledgeSource.createMany).not.toHaveBeenCalled();
  });

  it("rejects replacing deck sources when existing entries still reference removed sourceIds", async () => {
    const { prisma, service } = createDecksService();

    const tx = {
      knowledgeSource: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      cardInformationEntry: {
        findMany: vi.fn().mockResolvedValue([{ sourceIds: ["source-in-use"] }]),
      },
      symbolInformationEntry: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      deck: {
        update: vi.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx)
    );

    vi.spyOn(service as any, "requireOwnedDeckSummary").mockResolvedValue({
      id: "deck_owned_thoth",
    });
    vi.spyOn(service as any, "requireOwnedDeckDetail").mockResolvedValue({
      id: "deck_owned_thoth",
    });

    await expect(
      service.updateDeck("11111111-1111-1111-1111-111111111111", "deck_owned_thoth", {
        sources: [
          {
            sourceId: "replacement-source",
            kind: "starter_content",
            title: "Replacement",
          },
        ],
      })
    ).rejects.toThrow(BadRequestException);

    expect(tx.cardInformationEntry.findMany).toHaveBeenCalled();
    expect(tx.symbolInformationEntry.findMany).toHaveBeenCalled();
    expect(tx.knowledgeSource.deleteMany).not.toHaveBeenCalled();
    expect(tx.knowledgeSource.createMany).not.toHaveBeenCalled();
  });
});
