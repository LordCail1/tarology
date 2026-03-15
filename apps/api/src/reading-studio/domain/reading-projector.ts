import type { ReadingDetail } from "@tarology/shared";
import {
  READING_ARCHIVED_EVENT,
  READING_CANVAS_MODE_SWITCHED_EVENT,
  READING_CARD_FLIPPED_EVENT,
  READING_CARD_MOVED_EVENT,
  READING_CARD_ROTATED_EVENT,
  READING_CREATED_EVENT,
  READING_DELETED_EVENT,
  READING_REOPENED_EVENT,
  type ReadingCanvasModeSwitchedEventPayload,
  type ReadingCardFlippedEventPayload,
  type ReadingCardMovedEventPayload,
  type ReadingCardRotatedEventPayload,
  type ReadingLifecycleEventPayload,
  type ReadingStoredEvent,
} from "./reading-events.js";
import { normalizeRotation } from "./reading-canvas.js";

function isReadingDetail(payload: unknown): payload is ReadingDetail {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "readingId" in payload &&
    "assignments" in payload
  );
}

function isLifecyclePayload(payload: unknown): payload is ReadingLifecycleEventPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "status" in payload &&
    "version" in payload &&
    "updatedAt" in payload
  );
}

function isCanvasModePayload(payload: unknown): payload is ReadingCanvasModeSwitchedEventPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "canvasMode" in payload &&
    "version" in payload &&
    "updatedAt" in payload
  );
}

function isCardMovedPayload(payload: unknown): payload is ReadingCardMovedEventPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "cardId" in payload &&
    "version" in payload &&
    "updatedAt" in payload
  );
}

function isCardRotatedPayload(payload: unknown): payload is ReadingCardRotatedEventPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "cardId" in payload &&
    "deltaDeg" in payload &&
    "version" in payload &&
    "updatedAt" in payload
  );
}

function isCardFlippedPayload(payload: unknown): payload is ReadingCardFlippedEventPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "cardId" in payload &&
    "isFaceUp" in payload &&
    "version" in payload &&
    "updatedAt" in payload
  );
}

export function applyReadingEvent(
  current: ReadingDetail | null,
  event: ReadingStoredEvent
): ReadingDetail {
  switch (event.eventType) {
    case READING_CREATED_EVENT: {
      if (!isReadingDetail(event.payload)) {
        throw new Error("reading.created payload is invalid.");
      }
      return event.payload;
    }

    case READING_ARCHIVED_EVENT:
    case READING_REOPENED_EVENT:
    case READING_DELETED_EVENT: {
      if (!current) {
        throw new Error(`${event.eventType} requires an existing projection.`);
      }

      if (!isLifecyclePayload(event.payload)) {
        throw new Error(`${event.eventType} payload is invalid.`);
      }

      return {
        ...current,
        status: event.payload.status,
        version: event.payload.version,
        updatedAt: event.payload.updatedAt,
        archivedAt: event.payload.archivedAt,
        deletedAt: event.payload.deletedAt,
      };
    }

    case READING_CANVAS_MODE_SWITCHED_EVENT: {
      if (!current) {
        throw new Error(`${event.eventType} requires an existing projection.`);
      }

      if (!isCanvasModePayload(event.payload)) {
        throw new Error(`${event.eventType} payload is invalid.`);
      }

      return {
        ...current,
        canvasMode: event.payload.canvasMode,
        version: event.payload.version,
        updatedAt: event.payload.updatedAt,
        canvas: {
          ...current.canvas,
          activeMode: event.payload.canvasMode,
        },
      };
    }

    case READING_CARD_MOVED_EVENT: {
      if (!current) {
        throw new Error(`${event.eventType} requires an existing projection.`);
      }

      if (!isCardMovedPayload(event.payload)) {
        throw new Error(`${event.eventType} payload is invalid.`);
      }

      const payload = event.payload;

      return {
        ...current,
        version: payload.version,
        updatedAt: payload.updatedAt,
        canvas: {
          ...current.canvas,
          cards: current.canvas.cards.map((card) =>
            card.cardId === payload.cardId
              ? {
                  ...card,
                  freeform: payload.freeform
                    ? {
                        xPx: payload.freeform.xPx,
                        yPx: payload.freeform.yPx,
                        stackOrder: payload.freeform.stackOrder,
                      }
                    : card.freeform,
                  grid: payload.grid
                    ? {
                        column: payload.grid.column,
                        row: payload.grid.row,
                      }
                    : card.grid,
                }
              : card
          ),
        },
      };
    }

    case READING_CARD_ROTATED_EVENT: {
      if (!current) {
        throw new Error(`${event.eventType} requires an existing projection.`);
      }

      if (!isCardRotatedPayload(event.payload)) {
        throw new Error(`${event.eventType} payload is invalid.`);
      }

      const payload = event.payload;

      return {
        ...current,
        version: payload.version,
        updatedAt: payload.updatedAt,
        canvas: {
          ...current.canvas,
          cards: current.canvas.cards.map((card) =>
            card.cardId === payload.cardId
              ? {
                  ...card,
                  rotationDeg: normalizeRotation(card.rotationDeg + payload.deltaDeg),
                }
              : card
          ),
        },
      };
    }

    case READING_CARD_FLIPPED_EVENT: {
      if (!current) {
        throw new Error(`${event.eventType} requires an existing projection.`);
      }

      if (!isCardFlippedPayload(event.payload)) {
        throw new Error(`${event.eventType} payload is invalid.`);
      }

      const payload = event.payload;

      return {
        ...current,
        version: payload.version,
        updatedAt: payload.updatedAt,
        canvas: {
          ...current.canvas,
          cards: current.canvas.cards.map((card) =>
            card.cardId === payload.cardId
              ? {
                  ...card,
                  isFaceUp: payload.isFaceUp,
                }
              : card
          ),
        },
      };
    }

    default:
      throw new Error(`Unsupported reading event type: ${String(event.eventType)}`);
  }
}
