import type {
  ReadingDetail,
  ReadingLifecycleStatus,
} from "@tarology/shared";

export const READING_CREATED_EVENT = "reading.created";
export const READING_ARCHIVED_EVENT = "reading.archived";
export const READING_REOPENED_EVENT = "reading.reopened";
export const READING_DELETED_EVENT = "reading.deleted";
export const READING_CARD_MOVED_EVENT = "reading.card_moved";
export const READING_CARD_ROTATED_EVENT = "reading.card_rotated";
export const READING_CARD_FLIPPED_EVENT = "reading.card_flipped";

export type ReadingEventType =
  | typeof READING_CREATED_EVENT
  | typeof READING_ARCHIVED_EVENT
  | typeof READING_REOPENED_EVENT
  | typeof READING_DELETED_EVENT
  | typeof READING_CARD_MOVED_EVENT
  | typeof READING_CARD_ROTATED_EVENT
  | typeof READING_CARD_FLIPPED_EVENT;

export interface ReadingLifecycleEventPayload {
  status: ReadingLifecycleStatus;
  version: number;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface ReadingCardMovedEventPayload {
  cardId: string;
  version: number;
  updatedAt: string;
  freeform: {
    xPx: number;
    yPx: number;
    stackOrder: number;
  };
}

export interface ReadingCardRotatedEventPayload {
  cardId: string;
  deltaDeg: number;
  version: number;
  updatedAt: string;
}

export interface ReadingCardFlippedEventPayload {
  cardId: string;
  isFaceUp: boolean;
  version: number;
  updatedAt: string;
}

export type ReadingEventPayload =
  | ReadingDetail
  | ReadingLifecycleEventPayload
  | ReadingCardMovedEventPayload
  | ReadingCardRotatedEventPayload
  | ReadingCardFlippedEventPayload;

export interface ReadingStoredEvent {
  eventType: ReadingEventType;
  payload: ReadingEventPayload;
  version: number;
}
