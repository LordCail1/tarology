import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type Card as CardRecord, type Symbol as SymbolRecord } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { TOTAL_TAROT_CARDS } from "@tarology/shared";
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    sourceId: normalizeMutableKnowledgeSourceId(source.sourceId),
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

function normalizeMutableKnowledgeSourceId(sourceId: unknown): string {
  if (sourceId == null) {
    return randomUUID();
  }

  if (typeof sourceId !== "string") {
    throw new BadRequestException(
      'Knowledge source field "sourceId" must be a string when provided.'
    );
  }

  const trimmedSourceId = sourceId.trim();
  if (trimmedSourceId.length === 0) {
    throw new BadRequestException(
      'Knowledge source field "sourceId" must be a non-empty string when provided.'
    );
  }

  return trimmedSourceId;
}

function normalizeImportedKnowledgeSourceId(sourceId: unknown): string {
  if (typeof sourceId !== "string" || sourceId.trim().length === 0) {
    throw new BadRequestException(
      'Imported knowledge sources must provide a non-empty string "sourceId".'
    );
  }

  return sourceId.trim();
}

function ensureUniqueKnowledgeSourceIds(
  sources: Array<Pick<KnowledgeSourceWriteDto, "sourceId">>,
  message: string
): void {
  const seen = new Set<string>();

  for (const source of sources) {
    if (source.sourceId == null) {
      continue;
    }

    if (typeof source.sourceId !== "string") {
      throw new BadRequestException(
        'Knowledge source field "sourceId" must be a string when provided.'
      );
    }

    const sourceId = source.sourceId.trim();
    if (!sourceId) {
      throw new BadRequestException(
        'Knowledge source field "sourceId" must be a non-empty string when provided.'
      );
    }

    if (seen.has(sourceId)) {
      throw new ConflictException(message);
    }

    seen.add(sourceId);
  }
}

function ensureUniqueCardSymbolLinks(
  links: Array<Pick<ImportDeckRequest["cardSymbols"][number], "cardId" | "symbolId">>,
  message: string
): void {
  const seen = new Set<string>();

  for (const link of links) {
    const compositeKey = `${link.cardId}::${link.symbolId}`;
    if (seen.has(compositeKey)) {
      throw new ConflictException(message);
    }

    seen.add(compositeKey);
  }
}

function requireImportEntrySourceIds(
  sourceIds: unknown,
  message: string
): string[] {
  if (!Array.isArray(sourceIds)) {
    throw new BadRequestException(message);
  }

  return normalizeEntrySourceIds(
    sourceIds,
    message,
    'Imported knowledge entry field "sourceIds" must contain only non-empty strings.'
  );
}

function requireImportKnowledgeSourceIds(
  sources: Array<Pick<KnowledgeSourceWriteDto, "sourceId">>
): string[] {
  return sources.map((source) => normalizeImportedKnowledgeSourceId(source.sourceId));
}

function normalizeEntrySourceIds(
  sourceIds: unknown,
  typeMessage: string,
  blankMessage: string
): string[] {
  if (
    !Array.isArray(sourceIds) ||
    sourceIds.some((sourceId) => typeof sourceId !== "string")
  ) {
    throw new BadRequestException(typeMessage);
  }

  const normalizedSourceIds = sourceIds.map((sourceId) => sourceId.trim());
  if (normalizedSourceIds.some((sourceId) => sourceId.length === 0)) {
    throw new BadRequestException(blankMessage);
  }

  return normalizedSourceIds;
}

function normalizeKnowledgeEntryLabel(label: unknown): string {
  if (typeof label !== "string" || label.trim().length === 0) {
    throw new BadRequestException('Knowledge entry field "label" must be a non-empty string.');
  }

  return label.trim();
}

function normalizeKnowledgeEntryId(entryId: unknown): string | undefined {
  if (entryId == null) {
    return undefined;
  }
  if (typeof entryId !== "string" || entryId.trim().length === 0) {
    throw new BadRequestException('Knowledge entry field "entryId" must be a non-empty string when provided.');
  }

  return entryId.trim();
}

function normalizeLinkedRecordIds(
  linkedRecordIds: unknown,
  fieldName: "linkedSymbolIds" | "linkedCardIds"
): string[] {
  if (
    !Array.isArray(linkedRecordIds) ||
    linkedRecordIds.some((linkedRecordId) => typeof linkedRecordId !== "string")
  ) {
    throw new BadRequestException(
      `Deck link field "${fieldName}" must be an array of non-empty strings.`
    );
  }

  const normalizedLinkedRecordIds = linkedRecordIds.map((linkedRecordId) => linkedRecordId.trim());
  if (normalizedLinkedRecordIds.some((linkedRecordId) => linkedRecordId.length === 0)) {
    throw new BadRequestException(
      `Deck link field "${fieldName}" must be an array of non-empty strings.`
    );
  }

  return normalizedLinkedRecordIds;
}

function validateImportedDeckRecord(deck: ImportDeckRequest["deck"]): void {
  if (typeof deck.name !== "string" || deck.name.trim().length === 0) {
    throw new BadRequestException('Imported deck metadata must provide a non-empty string "name".');
  }
  if (typeof deck.deckSpecVersion !== "string" || deck.deckSpecVersion.trim().length === 0) {
    throw new BadRequestException(
      'Imported deck metadata must provide a non-empty string "deckSpecVersion".'
    );
  }
  if (!Number.isInteger(deck.knowledgeVersion) || deck.knowledgeVersion < 1) {
    throw new BadRequestException(
      'Imported deck metadata must provide a positive integer "knowledgeVersion".'
    );
  }
  if (typeof deck.initializationMode !== "string" || deck.initializationMode.trim().length === 0) {
    throw new BadRequestException(
      'Imported deck metadata must provide a non-empty string "initializationMode".'
    );
  }
  if (deck.description !== null && typeof deck.description !== "string") {
    throw new BadRequestException('Imported deck metadata field "description" must be a string or null.');
  }
  if (deck.initializerKey !== null && typeof deck.initializerKey !== "string") {
    throw new BadRequestException(
      'Imported deck metadata field "initializerKey" must be a string or null.'
    );
  }
  if (deck.previewImageUrl !== null && typeof deck.previewImageUrl !== "string") {
    throw new BadRequestException(
      'Imported deck metadata field "previewImageUrl" must be a string or null.'
    );
  }
  if (deck.backImageUrl !== null && typeof deck.backImageUrl !== "string") {
    throw new BadRequestException(
      'Imported deck metadata field "backImageUrl" must be a string or null.'
    );
  }
  if (!Number.isInteger(deck.cardCount)) {
    throw new BadRequestException('Imported deck metadata must provide an integer "cardCount".');
  }
}

function validateImportedCardRecord(card: ImportDeckRequest["cards"][number]): void {
  if (typeof card.cardId !== "string" || card.cardId.trim().length === 0) {
    throw new BadRequestException('Imported cards must provide a non-empty string "cardId".');
  }
  if (typeof card.name !== "string" || card.name.trim().length === 0) {
    throw new BadRequestException('Imported cards must provide a non-empty string "name".');
  }
  if (!Number.isInteger(card.sortOrder)) {
    throw new BadRequestException('Imported cards must provide an integer "sortOrder".');
  }
}

function validateImportedSymbolRecord(symbol: ImportDeckRequest["symbols"][number]): void {
  if (typeof symbol.symbolId !== "string" || symbol.symbolId.trim().length === 0) {
    throw new BadRequestException('Imported symbols must provide a non-empty string "symbolId".');
  }
  if (typeof symbol.name !== "string" || symbol.name.trim().length === 0) {
    throw new BadRequestException('Imported symbols must provide a non-empty string "name".');
  }
}

function normalizeKnowledgeEntryWrite(entry: KnowledgeEntryWriteDto): KnowledgeEntryWriteDto {
  ensureExclusiveEntryBody(entry);

  return {
    ...entry,
    entryId: normalizeKnowledgeEntryId(entry.entryId),
    label: normalizeKnowledgeEntryLabel(entry.label),
    sourceIds:
      entry.sourceIds == null
        ? []
        : normalizeEntrySourceIds(
            entry.sourceIds,
            'Knowledge entry field "sourceIds" must be an array of strings when provided.',
            'Knowledge entry field "sourceIds" must contain only non-empty strings.'
          ),
  };
}

function ensureUniqueScopedEntryIds<
  TEntry extends { entryId: string },
  TScope extends string,
>(
  entries: TEntry[],
  getScopeId: (entry: TEntry) => TScope,
  message: string
): void {
  const seen = new Set<string>();

  for (const entry of entries) {
    const compositeKey = `${getScopeId(entry)}::${entry.entryId}`;
    if (seen.has(compositeKey)) {
      throw new ConflictException(message);
    }

    seen.add(compositeKey);
  }
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
      return this.resolveLegacyDeckForReading(userId, deckId);
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
          sourceId: normalizeImportedKnowledgeSourceId(source.sourceId),
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
          sourceIds: requireImportEntrySourceIds(
            entry.sourceIds,
            'Imported card information entry field "sourceIds" must be an array of strings.'
          ),
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
          sourceIds: requireImportEntrySourceIds(
            entry.sourceIds,
            'Imported symbol information entry field "sourceIds" must be an array of strings.'
          ),
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
    ensureUniqueKnowledgeSourceIds(
      sources,
      "Duplicate sourceId values are not allowed when replacing deck sources."
    );

    const nextSourceIds = new Set(
      sources
        .map((source) => (typeof source.sourceId === "string" ? source.sourceId.trim() : null))
        .filter((sourceId): sourceId is string => Boolean(sourceId))
    );

    const [cardEntries, symbolEntries] = await Promise.all([
      tx.cardInformationEntry.findMany({
        where: {
          card: {
            deckId,
          },
        },
        select: {
          sourceIds: true,
        },
      }),
      tx.symbolInformationEntry.findMany({
        where: {
          symbol: {
            deckId,
          },
        },
        select: {
          sourceIds: true,
        },
      }),
    ]);

    const missingSourceIds = new Set<string>();

    for (const entry of [...cardEntries, ...symbolEntries]) {
      for (const sourceId of entry.sourceIds) {
        if (!nextSourceIds.has(sourceId)) {
          missingSourceIds.add(sourceId);
        }
      }
    }

    if (missingSourceIds.size > 0) {
      throw new BadRequestException(
        `Cannot remove in-use sourceIds from deck sources: ${Array.from(missingSourceIds)
          .sort()
          .join(", ")}.`
      );
    }

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
    const normalizedEntries = entries.map((entry) => normalizeKnowledgeEntryWrite(entry));

    await this.assertValidSourceIds(tx, deckId, normalizedEntries);

    await tx.cardInformationEntry.deleteMany({
      where: { cardRecordId },
    });

    if (normalizedEntries.length > 0) {
      await tx.cardInformationEntry.createMany({
        data: normalizedEntries.map((entry) => {
          return {
            id: randomUUID(),
            cardRecordId,
            entryId: entry.entryId ?? randomUUID(),
            label: entry.label,
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
    const normalizedEntries = entries.map((entry) => normalizeKnowledgeEntryWrite(entry));

    await this.assertValidSourceIds(tx, deckId, normalizedEntries);

    await tx.symbolInformationEntry.deleteMany({
      where: { symbolRecordId },
    });

    if (normalizedEntries.length > 0) {
      await tx.symbolInformationEntry.createMany({
        data: normalizedEntries.map((entry) => {
          return {
            id: randomUUID(),
            symbolRecordId,
            entryId: entry.entryId ?? randomUUID(),
            label: entry.label,
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
    const normalizedLinkedSymbolIds = normalizeLinkedRecordIds(linkedSymbolIds, "linkedSymbolIds");

    const symbols = normalizedLinkedSymbolIds.length
      ? await tx.symbol.findMany({
          where: {
            id: { in: normalizedLinkedSymbolIds },
            deckId,
          },
          select: { id: true },
        })
      : [];

    if (symbols.length !== normalizedLinkedSymbolIds.length) {
      throw new BadRequestException("One or more linked symbols are missing from this deck.");
    }

    await tx.cardSymbol.deleteMany({
      where: { cardRecordId },
    });

    if (normalizedLinkedSymbolIds.length > 0) {
      await tx.cardSymbol.createMany({
        data: normalizedLinkedSymbolIds.map((symbolRecordId, index) => ({
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
    const normalizedLinkedCardIds = normalizeLinkedRecordIds(linkedCardIds, "linkedCardIds");

    const cards = normalizedLinkedCardIds.length
      ? await tx.card.findMany({
          where: {
            id: { in: normalizedLinkedCardIds },
            deckId,
          },
          select: { id: true },
        })
      : [];

    if (cards.length !== normalizedLinkedCardIds.length) {
      throw new BadRequestException("One or more linked cards are missing from this deck.");
    }

    await tx.cardSymbol.deleteMany({
      where: { symbolRecordId },
    });

    if (normalizedLinkedCardIds.length > 0) {
      await tx.cardSymbol.createMany({
        data: normalizedLinkedCardIds.map((cardRecordId, index) => ({
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
        entries
          .flatMap((entry) => {
            if (entry.sourceIds == null) {
              return [];
            }
            return normalizeEntrySourceIds(
              entry.sourceIds,
              'Knowledge entry field "sourceIds" must be an array of strings when provided.',
              'Knowledge entry field "sourceIds" must contain only non-empty strings.'
            );
          })
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

  private async resolveLegacyDeckForReading(
    userId: string,
    legacyDeckId: string
  ): Promise<{ summary: DeckSummary; cardIds: string[] }> {
    return this.prisma.$transaction(async (tx) => {
      const legacyDeck = await tx.deck.findFirst({
        where: { id: legacyDeckId, ownerUserId: null },
        select: deckSummarySelect,
      });

      if (!legacyDeck || !legacyDeck.initializerKey) {
        throw new NotFoundException(`Deck "${legacyDeckId}" is not available.`);
      }

      const existingOwnedDeck = await tx.deck.findFirst({
        where: {
          ownerUserId: userId,
          initializerKey: legacyDeck.initializerKey,
          initializationMode: legacyDeck.initializationMode,
        },
        select: { id: true },
      });

      let ownedDeckId = existingOwnedDeck?.id ?? null;
      if (!ownedDeckId) {
        const seed =
          legacyDeck.initializationMode === "empty_template"
            ? this.starterDeckTemplatesService.getEmptyTemplateSeed(legacyDeck.initializerKey)
            : this.starterDeckTemplatesService.getStarterDeckSeed(legacyDeck.initializerKey);
        const createdDeck = await this.createDeckFromSeed(tx, userId, seed);
        ownedDeckId = createdDeck.id;
      }

      await tx.userPreference.updateMany({
        where: {
          userId,
          defaultDeckId: legacyDeckId,
        },
        data: {
          defaultDeckId: ownedDeckId,
        },
      });

      const ownedDeck = await tx.deck.findFirst({
        where: { id: ownedDeckId, ownerUserId: userId },
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

      if (!ownedDeck) {
        throw new NotFoundException(`Deck "${legacyDeckId}" is not available.`);
      }

      return {
        summary: toDeckSummary(ownedDeck),
        cardIds: ownedDeck.cards.map((card) => card.cardId),
      };
    });
  }

  private validateDeckImportPayload(payload: ImportDeckRequest): void {
    if (!isPlainObject(payload)) {
      throw new BadRequestException("Deck import payload must be an object.");
    }
    if (!isPlainObject(payload.deck)) {
      throw new BadRequestException('Deck import payload field "deck" must be an object.');
    }
    validateImportedDeckRecord(payload.deck);
    if (!Array.isArray(payload.cards)) {
      throw new BadRequestException('Deck import payload field "cards" must be an array.');
    }
    if (!Array.isArray(payload.symbols)) {
      throw new BadRequestException('Deck import payload field "symbols" must be an array.');
    }
    if (!Array.isArray(payload.cardSymbols)) {
      throw new BadRequestException(
        'Deck import payload field "cardSymbols" must be an array.'
      );
    }
    if (!Array.isArray(payload.knowledgeSources)) {
      throw new BadRequestException(
        'Deck import payload field "knowledgeSources" must be an array.'
      );
    }
    if (!Array.isArray(payload.cardInformationEntries)) {
      throw new BadRequestException(
        'Deck import payload field "cardInformationEntries" must be an array.'
      );
    }
    if (!Array.isArray(payload.symbolInformationEntries)) {
      throw new BadRequestException(
        'Deck import payload field "symbolInformationEntries" must be an array.'
      );
    }

    if (payload.format !== EXPORT_FORMAT || payload.version !== EXPORT_VERSION) {
      throw new BadRequestException("Unsupported deck export format or version.");
    }

    const cardIds = new Set<string>();
    for (const card of payload.cards) {
      validateImportedCardRecord(card);
      if (cardIds.has(card.cardId)) {
        throw new ConflictException(`Duplicate cardId "${card.cardId}" in import payload.`);
      }
      cardIds.add(card.cardId);
    }

    const symbolIds = new Set<string>();
    for (const symbol of payload.symbols) {
      validateImportedSymbolRecord(symbol);
      if (symbolIds.has(symbol.symbolId)) {
        throw new ConflictException(`Duplicate symbolId "${symbol.symbolId}" in import payload.`);
      }
      symbolIds.add(symbol.symbolId);
    }

    const sourceIds = new Set(requireImportKnowledgeSourceIds(payload.knowledgeSources));

    ensureUniqueKnowledgeSourceIds(
      payload.knowledgeSources,
      "Duplicate sourceId values are not allowed in import payload."
    );

    if (payload.cards.length !== TOTAL_TAROT_CARDS) {
      throw new BadRequestException(
        `Imported decks must contain exactly ${TOTAL_TAROT_CARDS} cards.`
      );
    }

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

    ensureUniqueCardSymbolLinks(
      payload.cardSymbols,
      "Duplicate card-symbol links are not allowed in import payload."
    );

    for (const entry of payload.cardInformationEntries) {
      if (!cardIds.has(entry.cardId)) {
        throw new BadRequestException("Imported card information entry references an unknown card.");
      }
      for (const sourceId of requireImportEntrySourceIds(
        entry.sourceIds,
        'Imported card information entry field "sourceIds" must be an array of strings.'
      )) {
        if (!sourceIds.has(sourceId)) {
          throw new BadRequestException("Imported card information entry references an unknown source.");
        }
      }
    }

    ensureUniqueScopedEntryIds(
      payload.cardInformationEntries,
      (entry) => entry.cardId,
      "Duplicate card information entryIds are not allowed per card in import payload."
    );

    for (const entry of payload.symbolInformationEntries) {
      if (!symbolIds.has(entry.symbolId)) {
        throw new BadRequestException(
          "Imported symbol information entry references an unknown symbol."
        );
      }
      for (const sourceId of requireImportEntrySourceIds(
        entry.sourceIds,
        'Imported symbol information entry field "sourceIds" must be an array of strings.'
      )) {
        if (!sourceIds.has(sourceId)) {
          throw new BadRequestException(
            "Imported symbol information entry references an unknown source."
          );
        }
      }
    }

    ensureUniqueScopedEntryIds(
      payload.symbolInformationEntries,
      (entry) => entry.symbolId,
      "Duplicate symbol information entryIds are not allowed per symbol in import payload."
    );
  }
}
