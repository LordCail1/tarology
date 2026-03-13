import type { Reading, ReadingCard } from "@prisma/client";
import type {
  CanvasMode,
  CreateReadingResponse,
  ReadingDetail,
  ReadingLifecycleStatus,
  ReadingSummary,
} from "@tarology/shared";

type ReadingWithCards = Reading & {
  cards: ReadingCard[];
};

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toSummaryBase(reading: Reading): ReadingSummary {
  return {
    readingId: reading.id,
    rootQuestion: reading.rootQuestion,
    deckId: reading.deckId,
    deckSpecVersion: reading.deckSpecVersion,
    canvasMode: reading.canvasMode as CanvasMode,
    status: reading.status as ReadingLifecycleStatus,
    version: reading.version,
    createdAt: reading.createdAt.toISOString(),
    updatedAt: reading.updatedAt.toISOString(),
    archivedAt: toIsoString(reading.archivedAt),
    deletedAt: toIsoString(reading.deletedAt),
  };
}

export function toReadingSummary(reading: Reading): ReadingSummary {
  return toSummaryBase(reading);
}

export function toReadingDetail(reading: ReadingWithCards): ReadingDetail {
  return {
    ...toSummaryBase(reading),
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
  };
}

export function toCreateReadingResponse(reading: ReadingWithCards): CreateReadingResponse {
  return toReadingDetail(reading);
}
