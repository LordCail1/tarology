import type { ReadingDetail, ReadingLifecycleStatus } from "@tarology/shared";

export const READING_CREATED_EVENT = "reading.created";
export const READING_ARCHIVED_EVENT = "reading.archived";
export const READING_REOPENED_EVENT = "reading.reopened";
export const READING_DELETED_EVENT = "reading.deleted";

export type ReadingEventType =
  | typeof READING_CREATED_EVENT
  | typeof READING_ARCHIVED_EVENT
  | typeof READING_REOPENED_EVENT
  | typeof READING_DELETED_EVENT;

export interface ReadingLifecycleEventPayload {
  status: ReadingLifecycleStatus;
  version: number;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export type ReadingEventPayload = ReadingDetail | ReadingLifecycleEventPayload;

export interface ReadingStoredEvent {
  eventType: ReadingEventType;
  payload: ReadingEventPayload;
  version: number;
}
