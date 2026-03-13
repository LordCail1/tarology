import type { ReadingDetail } from "@tarology/shared";
import {
  READING_ARCHIVED_EVENT,
  READING_CREATED_EVENT,
  READING_DELETED_EVENT,
  READING_REOPENED_EVENT,
  type ReadingLifecycleEventPayload,
  type ReadingStoredEvent,
} from "./reading-events.js";

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

    default:
      throw new Error(`Unsupported reading event type: ${String(event.eventType)}`);
  }
}
