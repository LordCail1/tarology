import type { Reading, ReadingCard } from "@prisma/client";
import type {
  CanvasMode,
  CreateReadingResponse,
  ReadingCanvasCardState,
  ReadingDetail,
  ReadingLifecycleStatus,
  ReadingSummary,
} from "@tarology/shared";

type ReadingWithCards = Reading & {
  cards: ReadingCard[];
};

type ReadingWithCount = Reading & {
  _count?: {
    cards: number;
  };
};

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toCanvasCards(cards: ReadingCard[]): ReadingCanvasCardState[] {
  return cards
    .slice()
    .sort((left, right) => left.deckIndex - right.deckIndex)
    .map((card) => ({
      deckIndex: card.deckIndex,
      cardId: card.cardId,
      assignedReversal: card.assignedReversal,
      isFaceUp: card.isFaceUp,
      rotationDeg: card.rotationDeg,
      freeform: {
        xPx: card.freeformXPx,
        yPx: card.freeformYPx,
        stackOrder: card.freeformStackOrder,
      },
      grid: {
        column: card.gridColumn,
        row: card.gridRow,
      },
    }));
}

function toSummaryBase(reading: ReadingWithCount): ReadingSummary {
  return {
    readingId: reading.id,
    rootQuestion: reading.rootQuestion,
    deckId: reading.deckId,
    deckSpecVersion: reading.deckSpecVersion,
    cardCount: reading._count?.cards ?? 0,
    canvasMode: reading.canvasMode as CanvasMode,
    status: reading.status as ReadingLifecycleStatus,
    version: reading.version,
    createdAt: reading.createdAt.toISOString(),
    updatedAt: reading.updatedAt.toISOString(),
    archivedAt: toIsoString(reading.archivedAt),
    deletedAt: toIsoString(reading.deletedAt),
  };
}

export function toReadingSummary(reading: ReadingWithCount): ReadingSummary {
  return toSummaryBase(reading);
}

export function toReadingDetail(reading: ReadingWithCards): ReadingDetail {
  const canvasCards = toCanvasCards(reading.cards);

  return {
    ...toSummaryBase({
      ...reading,
      _count: {
        cards: reading.cards.length,
      },
    }),
    shuffleAlgorithmVersion: reading.shuffleAlgorithmVersion,
    seedCommitment: reading.seedCommitment,
    orderHash: reading.orderHash,
    assignments: reading.cards
      .slice()
      .sort((left, right) => left.deckIndex - right.deckIndex)
      .map((card) => ({
        deckIndex: card.deckIndex,
        cardId: card.cardId,
        assignedReversal: card.assignedReversal,
      })),
    canvas: {
      activeMode: reading.canvasMode as CanvasMode,
      cards: canvasCards,
    },
  };
}

export function toCreateReadingResponse(reading: ReadingWithCards): CreateReadingResponse {
  return toReadingDetail(reading);
}
