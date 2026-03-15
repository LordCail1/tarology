import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type Card as CardRecord, type Symbol as SymbolRecord } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import type {
  CardDetail,
  CreateDeckRequest,
  CreateDeckResponse,
  CreateSymbolRequest,
  CreateSymbolResponse,
  DeckDetail,
  DeckExportEnvelope,
  DeckSummary,
  ExportDeckResponse,
  GetCardResponse,
  GetDeckResponse,
  GetDecksResponse,
  GetSymbolResponse,
  GetSymbolsResponse,
  ImportDeckRequest,
  ImportDeckResponse,
  KnowledgeEntryWriteDto,
  KnowledgeSourceWriteDto,
  SymbolDetail,
  UpdateCardRequest,
  UpdateCardResponse,
  UpdateDeckRequest,
  UpdateDeckResponse,
  UpdateSymbolRequest,
  UpdateSymbolResponse,
} from "@tarology/shared";
import { PrismaService } from "../database/prisma.service.js";
import {
  cardDetailInclude,
  deckDetailInclude,
  deckSummarySelect,
  symbolDetailInclude,
  toCardDetail,
  toDeckDetail,
  toDeckSummary,
  toKnowledgeEntryDto,
  toKnowledgeSourceDto,
  toSymbolDetail,
  type CardDetailRecord,
  type DeckDetailRecord,
  type DeckSummaryRecord,
  type SymbolDetailRecord,
} from "./knowledge-contract.mapper.js";
import {
  type StarterDeckSeed,
  StarterDeckTemplatesService,
} from "./starter-deck-templates.service.js";

type DbClient = PrismaService | Prisma.TransactionClient;

const EXPORT_FORMAT = "tarology.deck.export";
const EXPORT_VERSION = 1;

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toDateOrNull(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

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

function computeExportDigest(payload: DeckExportEnvelope): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function ensureExclusiveEntryBody(entry: KnowledgeEntryWriteDto): void {
  const hasBodyText = typeof entry.bodyText === "string" && entry.bodyText.trim().length > 0;
  const hasBodyJson = entry.bodyJson !== undefined && entry.bodyJson !== null;

  if (hasBodyText === hasBodyJson) {
    throw new BadRequestException(
      `Entry "${entry.label}" must provide exactly one of bodyText or bodyJson.`
    );
  }
}

function normalizeKnowledgeSource(
  source: KnowledgeSourceWriteDto
): Prisma.KnowledgeSourceCreateManyInput {
  return {
    id: randomUUID(),
    deckId: "",
    sourceId: source.sourceId ?? randomUUID(),
    kind: source.kind,
    title: source.title,
    capturedAt: toDateOrNull(source.capturedAt) ?? new Date(),
    author: source.author ?? null,
    publisher: source.publisher ?? null,
    url: source.url ?? null,
    citationText: source.citationText ?? null,
    publishedAt: toDateOrNull(source.publishedAt),
    rightsNote: source.rightsNote ?? null,
    metadataJson:
      source.metadataJson === undefined ? Prisma.JsonNull : toJson(source.metadataJson),
  };
}

@Injectable()
export class DecksService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(StarterDeckTemplatesService)
    private readonly starterDeckTemplatesService: StarterDeckTemplatesService
  ) {}

  async ensureStarterDeckForUser(
    tx: Prisma.TransactionClient,
    userId: string
  ): Promise<string> {
    const existingOwnedDeck = await tx.deck.findFirst({
      where: { ownerUserId: userId },
      select: { id: true },
    });

    if (existingOwnedDeck) {
      return existingOwnedDeck.id;
    }

    const starterSeed = this.starterDeckTemplatesService.getStarterDeckSeed("thoth");
    const createdDeck = await this.createDeckFromSeed(tx, userId, starterSeed);
    return createdDeck.id;
  }

  async listDecks(userId: string): Promise<GetDecksResponse> {
    const decks = await this.prisma.deck.findMany({
      where: { ownerUserId: userId },
      select: deckSummarySelect,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return {
      decks: decks.map(toDeckSummary),
    };
  }

  async getDeck(userId: string, deckId: string): Promise<GetDeckResponse> {
    const deck = await this.requireOwnedDeckDetail(this.prisma, userId, deckId);
    return {
      deck: toDeckDetail(deck),
    };
  }

  async createDeck(userId: string, payload: CreateDeckRequest): Promise<CreateDeckResponse> {
    return this.prisma.$transaction(async (tx) => {
      const seed =
        payload.initializationMode === "starter_content"
          ? this.starterDeckTemplatesService.getStarterDeckSeed(payload.initializerKey)
          : this.starterDeckTemplatesService.getEmptyTemplateSeed(payload.initializerKey);

      const deck = await this.createDeckFromSeed(tx, userId, {
        ...seed,
        name: payload.name?.trim() || seed.name,
        description: payload.description ?? seed.description,
      });

      const summary = await this.requireOwnedDeckSummary(tx, userId, deck.id);
      return {
        deck: toDeckSummary(summary),
      };
    });
  }

  async updateDeck(
    userId: string,
    deckId: string,
    payload: UpdateDeckRequest
  ): Promise<UpdateDeckResponse> {
    return this.prisma.$transaction(async (tx) => {
      await this.requireOwnedDeckSummary(tx, userId, deckId);

      const data: Prisma.DeckUpdateInput = {};
      if (payload.name !== undefined) {
        data.name = payload.name.trim();
      }
      if (payload.description !== undefined) {
        data.description = payload.description;
      }

      if (Object.keys(data).length > 0) {
        data.knowledgeVersion = { increment: 1 };
        await tx.deck.update({
          where: { id: deckId },
          data,
        });
      }

      if (payload.sources !== undefined) {
        await this.replaceKnowledgeSources(tx, deckId, payload.sources);
      }

      const updatedDeck = await this.requireOwnedDeckDetail(tx, userId, deckId);
      return {
        deck: toDeckDetail(updatedDeck),
      };
    });
  }

  async requireDeckForReading(
    userId: string,
    deckId: string
  ): Promise<{ summary: DeckSummary; cardIds: string[] }> {
    const deck = await this.prisma.deck.findFirst({
      where: { id: deckId, ownerUserId: userId },
      select: {
        ...deckSummarySelect,
        cards: {
          select: {
            cardId: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!deck) {
      throw new NotFoundException(`Deck "${deckId}" is not available.`);
    }

    return {
      summary: toDeckSummary(deck),
      cardIds: deck.cards.map((card) => card.cardId),
    };
  }

  async getCard(userId: string, cardRecordId: string): Promise<GetCardResponse> {
    const card = await this.requireOwnedCardDetail(this.prisma, userId, cardRecordId);
    return {
      card: toCardDetail(card),
    };
  }

  async updateCard(
    userId: string,
    cardRecordId: string,
    payload: UpdateCardRequest
  ): Promise<UpdateCardResponse> {
    return this.prisma.$transaction(async (tx) => {
      const card = await this.requireOwnedCardDetail(tx, userId, cardRecordId);

      const data: Prisma.CardUpdateInput = {};
      if (payload.name !== undefined) {
        data.name = payload.name.trim();
      }
      if (payload.shortLabel !== undefined) {
        data.shortLabel = payload.shortLabel;
      }
      if (payload.metadataJson !== undefined) {
        data.metadataJson =
          payload.metadataJson === null ? Prisma.JsonNull : toJson(payload.metadataJson);
      }

      if (Object.keys(data).length > 0) {
        await tx.card.update({
          where: { id: cardRecordId },
          data,
        });
        await this.bumpDeckKnowledgeVersion(tx, card.deckId);
      }

      if (payload.entries !== undefined) {
        await this.replaceCardEntries(tx, card.deckId, cardRecordId, payload.entries);
      }

      if (payload.linkedSymbolIds !== undefined) {
        await this.replaceCardLinks(tx, card.deckId, cardRecordId, payload.linkedSymbolIds);
      }

      const updatedCard = await this.requireOwnedCardDetail(tx, userId, cardRecordId);
      return {
        card: toCardDetail(updatedCard),
      };
    });
  }

  async listSymbols(userId: string, deckId?: string): Promise<GetSymbolsResponse> {
    const symbols = await this.prisma.symbol.findMany({
      where: {
        deck: {
          ownerUserId: userId,
          ...(deckId ? { id: deckId } : {}),
        },
      },
      include: {
        _count: {
          select: {
            informationEntries: true,
            cardSymbols: true,
          },
        },
      },
      orderBy: [{ name: "asc" }, { symbolId: "asc" }],
    });

    return {
      symbols: symbols.map((symbol) => ({
        id: symbol.id,
        deckId: symbol.deckId,
        symbolId: symbol.symbolId,
        name: symbol.name,
        shortLabel: symbol.shortLabel,
        description: symbol.description,
        metadataJson: symbol.metadataJson,
        entryCount: symbol._count.informationEntries,
        linkedCardCount: symbol._count.cardSymbols,
      })),
    };
  }

  async getSymbol(userId: string, symbolRecordId: string): Promise<GetSymbolResponse> {
    const symbol = await this.requireOwnedSymbolDetail(this.prisma, userId, symbolRecordId);
    return {
      symbol: toSymbolDetail(symbol),
    };
  }

  async createSymbol(
    userId: string,
    payload: CreateSymbolRequest
  ): Promise<CreateSymbolResponse> {
    return this.prisma.$transaction(async (tx) => {
      const deck = await this.requireOwnedDeckSummary(tx, userId, payload.deckId);

      const createdSymbol = await tx.symbol.create({
        data: {
          deckId: deck.id,
          symbolId: payload.symbolId?.trim() || randomUUID(),
          name: payload.name.trim(),
          shortLabel: payload.shortLabel ?? null,
          description: payload.description ?? null,
          metadataJson:
            payload.metadataJson === undefined
              ? Prisma.JsonNull
              : toJson(payload.metadataJson),
        },
      });

      if (payload.entries?.length) {
        await this.replaceSymbolEntries(tx, deck.id, createdSymbol.id, payload.entries);
      }

      if (payload.linkedCardIds?.length) {
        await this.replaceSymbolLinks(tx, deck.id, createdSymbol.id, payload.linkedCardIds);
      }

      await this.bumpDeckKnowledgeVersion(tx, deck.id);

      const symbol = await this.requireOwnedSymbolDetail(tx, userId, createdSymbol.id);
      return {
        symbol: toSymbolDetail(symbol),
      };
    });
  }

  async updateSymbol(
    userId: string,
    symbolRecordId: string,
    payload: UpdateSymbolRequest
  ): Promise<UpdateSymbolResponse> {
    return this.prisma.$transaction(async (tx) => {
      const symbol = await this.requireOwnedSymbolDetail(tx, userId, symbolRecordId);

      const data: Prisma.SymbolUpdateInput = {};
      if (payload.name !== undefined) {
        data.name = payload.name.trim();
      }
      if (payload.shortLabel !== undefined) {
        data.shortLabel = payload.shortLabel;
      }
      if (payload.description !== undefined) {
        data.description = payload.description;
      }
      if (payload.metadataJson !== undefined) {
        data.metadataJson =
          payload.metadataJson === null ? Prisma.JsonNull : toJson(payload.metadataJson);
      }

      if (Object.keys(data).length > 0) {
        await tx.symbol.update({
          where: { id: symbolRecordId },
          data,
        });
        await this.bumpDeckKnowledgeVersion(tx, symbol.deckId);
      }

      if (payload.entries !== undefined) {
        await this.replaceSymbolEntries(tx, symbol.deckId, symbolRecordId, payload.entries);
      }

      if (payload.linkedCardIds !== undefined) {
        await this.replaceSymbolLinks(tx, symbol.deckId, symbolRecordId, payload.linkedCardIds);
      }

      const updatedSymbol = await this.requireOwnedSymbolDetail(tx, userId, symbolRecordId);
      return {
        symbol: toSymbolDetail(updatedSymbol),
      };
    });
  }

  async exportDeck(userId: string, deckId: string): Promise<ExportDeckResponse> {
    return this.prisma.$transaction(async (tx) => {
      const deck = await this.requireOwnedDeckExportRecord(tx, userId, deckId);

      const payload: DeckExportEnvelope = {
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        deck: {
          name: deck.name,
          description: deck.description,
          deckSpecVersion: deck.deckSpecVersion,
          knowledgeVersion: deck.knowledgeVersion,
          initializationMode: deck.initializationMode,
          initializerKey: deck.initializerKey,
          previewImageUrl: deck.previewImageUrl,
          backImageUrl: deck.backImageUrl,
          cardCount: deck.cardCount,
          originExportDigest: deck.originExportDigest,
        },
        cards: deck.cards.map((card) => ({
          cardId: card.cardId,
          name: card.name,
          sortOrder: card.sortOrder,
          shortLabel: card.shortLabel,
          faceImageUrl: card.faceImageUrl,
          metadataJson: card.metadataJson,
        })),
        symbols: deck.symbols.map((symbol) => ({
          symbolId: symbol.symbolId,
          name: symbol.name,
          shortLabel: symbol.shortLabel,
          description: symbol.description,
          metadataJson: symbol.metadataJson,
        })),
        cardSymbols: deck.cardSymbols.map((link) => ({
          cardId: link.card.cardId,
          symbolId: link.symbol.symbolId,
          sortOrder: link.sortOrder,
          placementHintJson: link.placementHintJson,
          linkNote: link.linkNote,
        })),
        knowledgeSources: deck.knowledgeSources.map(toKnowledgeSourceDto),
        cardInformationEntries: deck.cards.flatMap((card) =>
          card.informationEntries.map((entry) => ({
            ...toKnowledgeEntryDto(entry),
            cardId: card.cardId,
          }))
        ),
        symbolInformationEntries: deck.symbols.flatMap((symbol) =>
          symbol.informationEntries.map((entry) => ({
            ...toKnowledgeEntryDto(entry),
            symbolId: symbol.symbolId,
          }))
        ),
      };

      const digest = computeExportDigest(payload);

      await tx.deckExport.create({
        data: {
          id: randomUUID(),
          deckId: deck.id,
          exporterUserId: userId,
          format: EXPORT_FORMAT,
          version: EXPORT_VERSION,
          digest,
          payload: toJson(payload),
        },
      });

      return payload;
    });
  }

  async importDeck(userId: string, payload: ImportDeckRequest): Promise<ImportDeckResponse> {
    this.validateDeckImportPayload(payload);
    const digest = computeExportDigest(payload);

    return this.prisma.$transaction(async (tx) => {
      const createdDeck = await this.createDeckFromImport(tx, userId, payload, digest);
      const summary = await this.requireOwnedDeckSummary(tx, userId, createdDeck.id);
      return {
        deck: toDeckSummary(summary),
      };
    });
  }

  private async createDeckFromSeed(
    tx: Prisma.TransactionClient,
    userId: string,
    seed: StarterDeckSeed
  ): Promise<{ id: string }> {
    const deckId = randomUUID();

    await tx.deck.create({
      data: {
        id: deckId,
        ownerUserId: userId,
        name: seed.name,
        description: seed.description,
        deckSpecVersion: seed.deckSpecVersion,
        knowledgeVersion: 1,
        initializationMode: seed.initializationMode,
        initializerKey: seed.initializerKey,
        originExportDigest: null,
        previewImageUrl: seed.previewImageUrl,
        backImageUrl: seed.backImageUrl,
        cardCount: seed.cards.length,
      },
    });

    await tx.card.createMany({
      data: seed.cards.map((card) => ({
        id: randomUUID(),
        deckId,
        cardId: card.cardId,
        name: card.name,
        shortLabel: card.shortLabel,
        sortOrder: card.sortOrder,
        faceImageUrl: card.faceImageUrl,
        metadataJson: toJson(card.metadataJson),
      })),
    });

    if (seed.knowledgeSources.length > 0) {
      await tx.knowledgeSource.createMany({
        data: seed.knowledgeSources.map((source) => ({
          id: randomUUID(),
          deckId,
          sourceId: source.sourceId,
          kind: source.kind,
          title: source.title,
          capturedAt: new Date(source.capturedAt),
          author: source.author,
          publisher: source.publisher,
          url: source.url,
          citationText: source.citationText,
          publishedAt: toDateOrNull(source.publishedAt),
          rightsNote: source.rightsNote,
          metadataJson:
            source.metadataJson === null ? Prisma.JsonNull : toJson(source.metadataJson),
        })),
      });
    }

    const cards = await tx.card.findMany({
      where: { deckId },
      select: { id: true, cardId: true },
    });
    const cardRecordIdByCardId = new Map(cards.map((card) => [card.cardId, card.id]));

    if (seed.cardInformationEntries.length > 0) {
      await tx.cardInformationEntry.createMany({
        data: seed.cardInformationEntries.map((entry) => ({
          id: randomUUID(),
          cardRecordId: cardRecordIdByCardId.get(entry.cardId)!,
          entryId: entry.entryId,
          label: entry.label,
          format: entry.format,
          bodyText: entry.bodyText,
          bodyJson:
            entry.bodyJson === null ? Prisma.JsonNull : toJson(entry.bodyJson),
          summary: entry.summary,
          tags: entry.tags,
          sourceIds: entry.sourceIds,
          sortOrder: entry.sortOrder,
          archivedAt: null,
        })),
      });
    }

    if (seed.symbols.length > 0) {
      await tx.symbol.createMany({
        data: seed.symbols.map((symbol) => ({
          id: randomUUID(),
          deckId,
          symbolId: symbol.symbolId,
          name: symbol.name,
          shortLabel: symbol.shortLabel,
          description: symbol.description,
          metadataJson:
            symbol.metadataJson === null ? Prisma.JsonNull : toJson(symbol.metadataJson),
        })),
      });
    }

    const symbols = await tx.symbol.findMany({
      where: { deckId },
      select: { id: true, symbolId: true },
    });
    const symbolRecordIdBySymbolId = new Map(symbols.map((symbol) => [symbol.symbolId, symbol.id]));

    if (seed.symbolInformationEntries.length > 0) {
      await tx.symbolInformationEntry.createMany({
        data: seed.symbolInformationEntries.map((entry) => ({
          id: randomUUID(),
          symbolRecordId: symbolRecordIdBySymbolId.get(entry.symbolId)!,
          entryId: entry.entryId,
          label: entry.label,
          format: entry.format,
          bodyText: entry.bodyText,
          bodyJson:
            entry.bodyJson === null ? Prisma.JsonNull : toJson(entry.bodyJson),
          summary: entry.summary,
          tags: entry.tags,
          sourceIds: entry.sourceIds,
          sortOrder: entry.sortOrder,
          archivedAt: null,
        })),
      });
    }

    if (seed.cardSymbols.length > 0) {
      await tx.cardSymbol.createMany({
        data: seed.cardSymbols.map((link) => ({
          id: randomUUID(),
          deckId,
          cardRecordId: cardRecordIdByCardId.get(link.cardId)!,
          symbolRecordId: symbolRecordIdBySymbolId.get(link.symbolId)!,
          sortOrder: link.sortOrder,
          placementHintJson:
            link.placementHintJson === null
              ? Prisma.JsonNull
              : toJson(link.placementHintJson),
          linkNote: link.linkNote,
        })),
      });
    }

    return { id: deckId };
  }

  private async createDeckFromImport(
    tx: Prisma.TransactionClient,
    userId: string,
    payload: ImportDeckRequest,
    digest: string
  ): Promise<{ id: string }> {
    const deckId = randomUUID();

    await tx.deck.create({
      data: {
        id: deckId,
        ownerUserId: userId,
        name: payload.deck.name,
        description: payload.deck.description,
        deckSpecVersion: payload.deck.deckSpecVersion,
        knowledgeVersion: payload.deck.knowledgeVersion,
        initializationMode: "imported_clone",
        initializerKey: payload.deck.initializerKey,
        originExportDigest: digest,
        previewImageUrl: payload.deck.previewImageUrl,
        backImageUrl: payload.deck.backImageUrl,
        cardCount: payload.cards.length,
      },
    });

    await tx.card.createMany({
      data: payload.cards.map((card) => ({
        id: randomUUID(),
        deckId,
        cardId: card.cardId,
        name: card.name,
        shortLabel: card.shortLabel,
        sortOrder: card.sortOrder,
        faceImageUrl: card.faceImageUrl,
        metadataJson:
          card.metadataJson === null ? Prisma.JsonNull : toJson(card.metadataJson),
      })),
    });

    if (payload.knowledgeSources.length > 0) {
      await tx.knowledgeSource.createMany({
        data: payload.knowledgeSources.map((source) => ({
          id: randomUUID(),
          deckId,
          sourceId: source.sourceId,
          kind: source.kind,
          title: source.title,
          capturedAt: new Date(source.capturedAt),
          author: source.author,
          publisher: source.publisher,
          url: source.url,
          citationText: source.citationText,
          publishedAt: toDateOrNull(source.publishedAt),
          rightsNote: source.rightsNote,
          metadataJson:
            source.metadataJson === null ? Prisma.JsonNull : toJson(source.metadataJson),
        })),
      });
    }

    const cards = await tx.card.findMany({
      where: { deckId },
      select: { id: true, cardId: true },
    });
    const cardRecordIdByCardId = new Map(cards.map((card) => [card.cardId, card.id]));

    if (payload.symbols.length > 0) {
      await tx.symbol.createMany({
        data: payload.symbols.map((symbol) => ({
          id: randomUUID(),
          deckId,
          symbolId: symbol.symbolId,
          name: symbol.name,
          shortLabel: symbol.shortLabel,
          description: symbol.description,
          metadataJson:
            symbol.metadataJson === null ? Prisma.JsonNull : toJson(symbol.metadataJson),
        })),
      });
    }

    const symbols = await tx.symbol.findMany({
      where: { deckId },
      select: { id: true, symbolId: true },
    });
    const symbolRecordIdBySymbolId = new Map(symbols.map((symbol) => [symbol.symbolId, symbol.id]));

    if (payload.cardInformationEntries.length > 0) {
      await tx.cardInformationEntry.createMany({
        data: payload.cardInformationEntries.map((entry) => ({
          id: randomUUID(),
          cardRecordId: cardRecordIdByCardId.get(entry.cardId)!,
          entryId: entry.entryId,
          label: entry.label,
          format: entry.format,
          bodyText: entry.bodyText,
          bodyJson:
            entry.bodyJson === null ? Prisma.JsonNull : toJson(entry.bodyJson),
          summary: entry.summary,
          tags: entry.tags,
          sourceIds: entry.sourceIds,
          sortOrder: entry.sortOrder,
          archivedAt: toDateOrNull(entry.archivedAt),
        })),
      });
    }

    if (payload.symbolInformationEntries.length > 0) {
      await tx.symbolInformationEntry.createMany({
        data: payload.symbolInformationEntries.map((entry) => ({
          id: randomUUID(),
          symbolRecordId: symbolRecordIdBySymbolId.get(entry.symbolId)!,
          entryId: entry.entryId,
          label: entry.label,
          format: entry.format,
          bodyText: entry.bodyText,
          bodyJson:
            entry.bodyJson === null ? Prisma.JsonNull : toJson(entry.bodyJson),
          summary: entry.summary,
          tags: entry.tags,
          sourceIds: entry.sourceIds,
          sortOrder: entry.sortOrder,
          archivedAt: toDateOrNull(entry.archivedAt),
        })),
      });
    }

    if (payload.cardSymbols.length > 0) {
      await tx.cardSymbol.createMany({
        data: payload.cardSymbols.map((link) => ({
          id: randomUUID(),
          deckId,
          cardRecordId: cardRecordIdByCardId.get(link.cardId)!,
          symbolRecordId: symbolRecordIdBySymbolId.get(link.symbolId)!,
          sortOrder: link.sortOrder,
          placementHintJson:
            link.placementHintJson === null
              ? Prisma.JsonNull
              : toJson(link.placementHintJson),
          linkNote: link.linkNote,
        })),
      });
    }

    return { id: deckId };
  }

  private async replaceKnowledgeSources(
    tx: Prisma.TransactionClient,
    deckId: string,
    sources: KnowledgeSourceWriteDto[]
  ): Promise<void> {
    await tx.knowledgeSource.deleteMany({ where: { deckId } });

    if (sources.length === 0) {
      await this.bumpDeckKnowledgeVersion(tx, deckId);
      return;
    }

    const normalizedSources = sources.map(normalizeKnowledgeSource);

    await tx.knowledgeSource.createMany({
      data: normalizedSources.map((source) => ({
        ...source,
        deckId,
      })),
    });

    await this.bumpDeckKnowledgeVersion(tx, deckId);
  }

  private async replaceCardEntries(
    tx: Prisma.TransactionClient,
    deckId: string,
    cardRecordId: string,
    entries: KnowledgeEntryWriteDto[]
  ): Promise<void> {
    await this.assertValidSourceIds(tx, deckId, entries);

    await tx.cardInformationEntry.deleteMany({
      where: { cardRecordId },
    });

    if (entries.length > 0) {
      await tx.cardInformationEntry.createMany({
        data: entries.map((entry) => {
          ensureExclusiveEntryBody(entry);
          return {
            id: randomUUID(),
            cardRecordId,
            entryId: entry.entryId?.trim() || randomUUID(),
            label: entry.label.trim(),
            format: entry.format,
            bodyText: entry.bodyText ?? null,
            bodyJson:
              entry.bodyJson === undefined || entry.bodyJson === null
                ? Prisma.JsonNull
                : toJson(entry.bodyJson),
            summary: entry.summary ?? null,
            tags: entry.tags ?? [],
            sourceIds: entry.sourceIds ?? [],
            sortOrder: entry.sortOrder,
            archivedAt: entry.archived ? new Date() : null,
          };
        }),
      });
    }

    await this.bumpDeckKnowledgeVersion(tx, deckId);
  }

  private async replaceSymbolEntries(
    tx: Prisma.TransactionClient,
    deckId: string,
    symbolRecordId: string,
    entries: KnowledgeEntryWriteDto[]
  ): Promise<void> {
    await this.assertValidSourceIds(tx, deckId, entries);

    await tx.symbolInformationEntry.deleteMany({
      where: { symbolRecordId },
    });

    if (entries.length > 0) {
      await tx.symbolInformationEntry.createMany({
        data: entries.map((entry) => {
          ensureExclusiveEntryBody(entry);
          return {
            id: randomUUID(),
            symbolRecordId,
            entryId: entry.entryId?.trim() || randomUUID(),
            label: entry.label.trim(),
            format: entry.format,
            bodyText: entry.bodyText ?? null,
            bodyJson:
              entry.bodyJson === undefined || entry.bodyJson === null
                ? Prisma.JsonNull
                : toJson(entry.bodyJson),
            summary: entry.summary ?? null,
            tags: entry.tags ?? [],
            sourceIds: entry.sourceIds ?? [],
            sortOrder: entry.sortOrder,
            archivedAt: entry.archived ? new Date() : null,
          };
        }),
      });
    }

    await this.bumpDeckKnowledgeVersion(tx, deckId);
  }

  private async replaceCardLinks(
    tx: Prisma.TransactionClient,
    deckId: string,
    cardRecordId: string,
    linkedSymbolIds: string[]
  ): Promise<void> {
    const symbols = linkedSymbolIds.length
      ? await tx.symbol.findMany({
          where: {
            id: { in: linkedSymbolIds },
            deckId,
          },
          select: { id: true },
        })
      : [];

    if (symbols.length !== linkedSymbolIds.length) {
      throw new BadRequestException("One or more linked symbols are missing from this deck.");
    }

    await tx.cardSymbol.deleteMany({
      where: { cardRecordId },
    });

    if (linkedSymbolIds.length > 0) {
      await tx.cardSymbol.createMany({
        data: linkedSymbolIds.map((symbolRecordId, index) => ({
          id: randomUUID(),
          deckId,
          cardRecordId,
          symbolRecordId,
          sortOrder: index + 1,
          placementHintJson: Prisma.JsonNull,
          linkNote: null,
        })),
      });
    }

    await this.bumpDeckKnowledgeVersion(tx, deckId);
  }

  private async replaceSymbolLinks(
    tx: Prisma.TransactionClient,
    deckId: string,
    symbolRecordId: string,
    linkedCardIds: string[]
  ): Promise<void> {
    const cards = linkedCardIds.length
      ? await tx.card.findMany({
          where: {
            id: { in: linkedCardIds },
            deckId,
          },
          select: { id: true },
        })
      : [];

    if (cards.length !== linkedCardIds.length) {
      throw new BadRequestException("One or more linked cards are missing from this deck.");
    }

    await tx.cardSymbol.deleteMany({
      where: { symbolRecordId },
    });

    if (linkedCardIds.length > 0) {
      await tx.cardSymbol.createMany({
        data: linkedCardIds.map((cardRecordId, index) => ({
          id: randomUUID(),
          deckId,
          cardRecordId,
          symbolRecordId,
          sortOrder: index + 1,
          placementHintJson: Prisma.JsonNull,
          linkNote: null,
        })),
      });
    }

    await this.bumpDeckKnowledgeVersion(tx, deckId);
  }

  private async assertValidSourceIds(
    tx: Prisma.TransactionClient,
    deckId: string,
    entries: KnowledgeEntryWriteDto[]
  ): Promise<void> {
    const referencedSourceIds = Array.from(
      new Set(
        entries.flatMap((entry) => entry.sourceIds ?? []).filter((sourceId) => sourceId.trim().length > 0)
      )
    );

    if (referencedSourceIds.length === 0) {
      return;
    }

    const knownSources = await tx.knowledgeSource.findMany({
      where: {
        deckId,
        sourceId: {
          in: referencedSourceIds,
        },
      },
      select: { sourceId: true },
    });

    if (knownSources.length !== referencedSourceIds.length) {
      throw new BadRequestException(
        "Knowledge entries referenced one or more unknown sourceIds for this deck."
      );
    }
  }

  private async bumpDeckKnowledgeVersion(
    tx: Prisma.TransactionClient,
    deckId: string
  ): Promise<void> {
    await tx.deck.update({
      where: { id: deckId },
      data: {
        knowledgeVersion: { increment: 1 },
      },
    });
  }

  private async requireOwnedDeckSummary(
    db: DbClient,
    userId: string,
    deckId: string
  ): Promise<DeckSummaryRecord> {
    const deck = await db.deck.findFirst({
      where: { id: deckId, ownerUserId: userId },
      select: deckSummarySelect,
    });

    if (!deck) {
      throw new NotFoundException(`Deck "${deckId}" is not available.`);
    }

    return deck;
  }

  private async requireOwnedDeckDetail(
    db: DbClient,
    userId: string,
    deckId: string
  ): Promise<DeckDetailRecord> {
    const deck = await db.deck.findFirst({
      where: { id: deckId, ownerUserId: userId },
      include: deckDetailInclude,
    });

    if (!deck) {
      throw new NotFoundException(`Deck "${deckId}" is not available.`);
    }

    return deck;
  }

  private async requireOwnedCardDetail(
    db: DbClient,
    userId: string,
    cardRecordId: string
  ): Promise<CardDetailRecord> {
    const card = await db.card.findFirst({
      where: {
        id: cardRecordId,
        deck: {
          ownerUserId: userId,
        },
      },
      include: cardDetailInclude,
    });

    if (!card) {
      throw new NotFoundException(`Card "${cardRecordId}" is not available.`);
    }

    return card;
  }

  private async requireOwnedSymbolDetail(
    db: DbClient,
    userId: string,
    symbolRecordId: string
  ): Promise<SymbolDetailRecord> {
    const symbol = await db.symbol.findFirst({
      where: {
        id: symbolRecordId,
        deck: {
          ownerUserId: userId,
        },
      },
      include: symbolDetailInclude,
    });

    if (!symbol) {
      throw new NotFoundException(`Symbol "${symbolRecordId}" is not available.`);
    }

    return symbol;
  }

  private async requireOwnedDeckExportRecord(
    db: DbClient,
    userId: string,
    deckId: string
  ) {
    const deck = await db.deck.findFirst({
      where: { id: deckId, ownerUserId: userId },
      include: {
        knowledgeSources: {
          orderBy: [{ title: "asc" }, { sourceId: "asc" }],
        },
        cards: {
          orderBy: { sortOrder: "asc" },
          include: {
            informationEntries: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        symbols: {
          orderBy: { name: "asc" },
          include: {
            informationEntries: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        cardSymbols: {
          orderBy: { sortOrder: "asc" },
          include: {
            card: {
              select: { cardId: true },
            },
            symbol: {
              select: { symbolId: true },
            },
          },
        },
      },
    });

    if (!deck) {
      throw new NotFoundException(`Deck "${deckId}" is not available.`);
    }

    return deck;
  }

  private validateDeckImportPayload(payload: ImportDeckRequest): void {
    if (payload.format !== EXPORT_FORMAT || payload.version !== EXPORT_VERSION) {
      throw new BadRequestException("Unsupported deck export format or version.");
    }

    const cardIds = new Set<string>();
    for (const card of payload.cards) {
      if (cardIds.has(card.cardId)) {
        throw new ConflictException(`Duplicate cardId "${card.cardId}" in import payload.`);
      }
      cardIds.add(card.cardId);
    }

    const symbolIds = new Set<string>();
    for (const symbol of payload.symbols) {
      if (symbolIds.has(symbol.symbolId)) {
        throw new ConflictException(`Duplicate symbolId "${symbol.symbolId}" in import payload.`);
      }
      symbolIds.add(symbol.symbolId);
    }

    const sourceIds = new Set(payload.knowledgeSources.map((source) => source.sourceId));
    const sortedCardOrders = payload.cards
      .map((card) => card.sortOrder)
      .sort((left, right) => left - right);

    for (let index = 0; index < sortedCardOrders.length; index += 1) {
      if (sortedCardOrders[index] !== index) {
        throw new BadRequestException(
          "Imported card sortOrder values must form one deterministic ordered roster."
        );
      }
    }

    for (const link of payload.cardSymbols) {
      if (!cardIds.has(link.cardId) || !symbolIds.has(link.symbolId)) {
        throw new BadRequestException(
          "Imported card-symbol links must reference existing cards and symbols."
        );
      }
    }

    for (const entry of payload.cardInformationEntries) {
      if (!cardIds.has(entry.cardId)) {
        throw new BadRequestException("Imported card information entry references an unknown card.");
      }
      for (const sourceId of entry.sourceIds) {
        if (!sourceIds.has(sourceId)) {
          throw new BadRequestException("Imported card information entry references an unknown source.");
        }
      }
    }

    for (const entry of payload.symbolInformationEntries) {
      if (!symbolIds.has(entry.symbolId)) {
        throw new BadRequestException(
          "Imported symbol information entry references an unknown symbol."
        );
      }
      for (const sourceId of entry.sourceIds) {
        if (!sourceIds.has(sourceId)) {
          throw new BadRequestException(
            "Imported symbol information entry references an unknown source."
          );
        }
      }
    }
  }
}
