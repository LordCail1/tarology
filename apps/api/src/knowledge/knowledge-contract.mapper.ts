import { Prisma } from "@prisma/client";
import type {
  CardDetail,
  CardSummaryDto,
  DeckDetail,
  DeckSummary,
  KnowledgeEntryDto,
  KnowledgeSourceDto,
  SymbolDetail,
  SymbolSummaryDto,
} from "@tarology/shared";

export const deckSummarySelect = {
  id: true,
  name: true,
  description: true,
  deckSpecVersion: true,
  knowledgeVersion: true,
  initializationMode: true,
  initializerKey: true,
  previewImageUrl: true,
  backImageUrl: true,
  cardCount: true,
  _count: {
    select: {
      symbols: true,
    },
  },
} satisfies Prisma.DeckSelect;

export const deckDetailInclude = {
  knowledgeSources: {
    orderBy: [{ title: "asc" }, { sourceId: "asc" }],
  },
  cards: {
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: {
          informationEntries: true,
          cardSymbols: true,
        },
      },
    },
  },
  symbols: {
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          informationEntries: true,
          cardSymbols: true,
        },
      },
    },
  },
  _count: {
    select: {
      symbols: true,
    },
  },
} satisfies Prisma.DeckInclude;

export const cardDetailInclude = {
  informationEntries: {
    orderBy: { sortOrder: "asc" },
  },
  cardSymbols: {
    orderBy: { sortOrder: "asc" },
    include: {
      symbol: {
        include: {
          _count: {
            select: {
              informationEntries: true,
              cardSymbols: true,
            },
          },
        },
      },
    },
  },
  _count: {
    select: {
      informationEntries: true,
      cardSymbols: true,
    },
  },
} satisfies Prisma.CardInclude;

export const symbolDetailInclude = {
  informationEntries: {
    orderBy: { sortOrder: "asc" },
  },
  cardSymbols: {
    orderBy: { sortOrder: "asc" },
    include: {
      card: {
        include: {
          _count: {
            select: {
              informationEntries: true,
              cardSymbols: true,
            },
          },
        },
      },
    },
  },
  _count: {
    select: {
      informationEntries: true,
      cardSymbols: true,
    },
  },
} satisfies Prisma.SymbolInclude;

export type DeckSummaryRecord = Prisma.DeckGetPayload<{
  select: typeof deckSummarySelect;
}>;
export type DeckDetailRecord = Prisma.DeckGetPayload<{
  include: typeof deckDetailInclude;
}>;
export type CardDetailRecord = Prisma.CardGetPayload<{
  include: typeof cardDetailInclude;
}>;
export type SymbolDetailRecord = Prisma.SymbolGetPayload<{
  include: typeof symbolDetailInclude;
}>;
export type KnowledgeSourceRecord = DeckDetailRecord["knowledgeSources"][number];
export type CardInformationEntryRecord = CardDetailRecord["informationEntries"][number];
export type SymbolInformationEntryRecord = SymbolDetailRecord["informationEntries"][number];

function toIsoStringOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function toDeckSummary(deck: DeckSummaryRecord): DeckSummary {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    specVersion: deck.deckSpecVersion,
    knowledgeVersion: deck.knowledgeVersion,
    initializationMode: deck.initializationMode,
    initializerKey: deck.initializerKey,
    previewImageUrl: deck.previewImageUrl,
    backImageUrl: deck.backImageUrl,
    cardCount: deck.cardCount,
    symbolCount: deck._count.symbols,
  };
}

export function toKnowledgeSourceDto(source: KnowledgeSourceRecord): KnowledgeSourceDto {
  return {
    id: source.id,
    deckId: source.deckId,
    sourceId: source.sourceId,
    kind: source.kind,
    title: source.title,
    capturedAt: source.capturedAt.toISOString(),
    author: source.author,
    publisher: source.publisher,
    url: source.url,
    citationText: source.citationText,
    publishedAt: toIsoStringOrNull(source.publishedAt),
    rightsNote: source.rightsNote,
    metadataJson: source.metadataJson,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  };
}

export function toKnowledgeEntryDto(
  entry: CardInformationEntryRecord | SymbolInformationEntryRecord
): KnowledgeEntryDto {
  return {
    id: entry.id,
    entryId: entry.entryId,
    label: entry.label,
    format: entry.format,
    bodyText: entry.bodyText,
    bodyJson: entry.bodyJson,
    summary: entry.summary,
    tags: entry.tags,
    sourceIds: entry.sourceIds,
    sortOrder: entry.sortOrder,
    archivedAt: toIsoStringOrNull(entry.archivedAt),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export function toCardSummaryDto(
  card: DeckDetailRecord["cards"][number] | SymbolDetailRecord["cardSymbols"][number]["card"]
): CardSummaryDto {
  return {
    id: card.id,
    deckId: card.deckId,
    cardId: card.cardId,
    name: card.name,
    shortLabel: card.shortLabel,
    sortOrder: card.sortOrder,
    faceImageUrl: card.faceImageUrl,
    metadataJson: card.metadataJson,
    entryCount: card._count.informationEntries,
    linkedSymbolCount: card._count.cardSymbols,
  };
}

export function toSymbolSummaryDto(
  symbol: DeckDetailRecord["symbols"][number] | CardDetailRecord["cardSymbols"][number]["symbol"]
): SymbolSummaryDto {
  return {
    id: symbol.id,
    deckId: symbol.deckId,
    symbolId: symbol.symbolId,
    name: symbol.name,
    shortLabel: symbol.shortLabel,
    description: symbol.description,
    metadataJson: symbol.metadataJson,
    entryCount: symbol._count.informationEntries,
    linkedCardCount: symbol._count.cardSymbols,
  };
}

export function toDeckDetail(deck: DeckDetailRecord): DeckDetail {
  return {
    ...toDeckSummary(deck),
    sources: deck.knowledgeSources.map(toKnowledgeSourceDto),
    cards: deck.cards.map(toCardSummaryDto),
    symbols: deck.symbols.map(toSymbolSummaryDto),
  };
}

export function toCardDetail(card: CardDetailRecord): CardDetail {
  return {
    ...toCardSummaryDto(card),
    entries: card.informationEntries.map(toKnowledgeEntryDto),
    linkedSymbols: card.cardSymbols.map((link) => toSymbolSummaryDto(link.symbol)),
  };
}

export function toSymbolDetail(symbol: SymbolDetailRecord): SymbolDetail {
  return {
    ...toSymbolSummaryDto(symbol),
    entries: symbol.informationEntries.map(toKnowledgeEntryDto),
    linkedCards: symbol.cardSymbols.map((link) => toCardSummaryDto(link.card)),
  };
}
