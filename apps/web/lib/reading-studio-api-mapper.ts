import type { GetReadingResponse, ListReadingsResponse } from "@tarology/shared";
import type {
  InterpretationHistoryItem,
  QuestionThreadItem,
  ReadingHistoryItem,
  ReadingStudioWorkspace,
} from "./reading-studio-types";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatReadingCreatedAtLabel(
  createdAtIso: string,
  now: Date = new Date()
): string {
  const createdAt = new Date(createdAtIso);
  const dayDelta = Math.floor(
    (startOfDay(now).getTime() - startOfDay(createdAt).getTime()) /
      (24 * 60 * 60 * 1000)
  );

  if (dayDelta <= 0) {
    return `Today, ${timeFormatter.format(createdAt)}`;
  }

  if (dayDelta === 1) {
    return `Yesterday, ${timeFormatter.format(createdAt)}`;
  }

  return dateFormatter.format(createdAt);
}

export function humanizeCardId(cardId: string): string {
  const withoutPrefix = cardId
    .replace(/^major:/, "")
    .replace(/^minor:/, "")
    .replace(/:/g, " ");

  return withoutPrefix
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function toReadingHistoryItem(
  reading: ListReadingsResponse["readings"][number]
): ReadingHistoryItem {
  return {
    id: reading.readingId,
    title: reading.rootQuestion,
    createdAtIso: reading.createdAt,
    createdAtLabel: formatReadingCreatedAtLabel(reading.createdAt),
    updatedAtIso: reading.updatedAt,
    cardCount: reading.cardCount,
    status: reading.status,
    version: reading.version,
    deckId: reading.deckId,
    deckSpecVersion: reading.deckSpecVersion,
  };
}

export function createPlaceholderThreads(): QuestionThreadItem[] {
  return [];
}

export function createPlaceholderInterpretations(): InterpretationHistoryItem[] {
  return [];
}

export function toReadingWorkspace(reading: GetReadingResponse): ReadingStudioWorkspace {
  return {
    reading: {
      id: reading.readingId,
      title: reading.rootQuestion,
      createdAtIso: reading.createdAt,
      createdAtLabel: formatReadingCreatedAtLabel(reading.createdAt),
      updatedAtIso: reading.updatedAt,
      cardCount: reading.cardCount,
      status: reading.status,
      version: reading.version,
      deckId: reading.deckId,
      deckSpecVersion: reading.deckSpecVersion,
    },
    threads: createPlaceholderThreads(),
    interpretations: createPlaceholderInterpretations(),
    canvas: {
      cards: reading.canvas.cards.map((card) => ({
        id: card.cardId,
        label: humanizeCardId(card.cardId),
        assignedReversal: card.assignedReversal,
        isFaceUp: card.isFaceUp,
        rotationDeg: card.rotationDeg,
        freeform: {
          xPx: card.freeform.xPx,
          yPx: card.freeform.yPx,
          stackOrder: card.freeform.stackOrder,
        },
      })),
    },
  };
}
