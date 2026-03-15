import type { UserPreferencesDto } from "@tarology/shared";
import {
  fetchReading,
  fetchReadings,
  postCreateReading,
  postReadingCommand,
} from "./client-api";
import {
  toReadingHistoryItem,
  toReadingWorkspace,
} from "./reading-studio-api-mapper";
import { READING_STUDIO_ACTIVE_READING_STORAGE_KEY } from "./reading-studio-data-source";
import type {
  ReadingStudioAction,
  ReadingStudioDataSource,
  ReadingStudioSnapshot,
  ReadingStudioWorkspace,
} from "./reading-studio-types";

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readPersistedActiveReadingId(storage: Storage | undefined): string | null {
  return storage?.getItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY) ?? null;
}

function writePersistedActiveReadingId(
  storage: Storage | undefined,
  readingId: string
): void {
  try {
    storage?.setItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY, readingId);
  } catch {
    // Ignore storage write failures.
  }
}

export function createApiReadingStudioDataSource(
  storage: Storage | undefined,
  preferences: UserPreferencesDto
): ReadingStudioDataSource {
  async function fetchWorkspace(readingId: string): Promise<ReadingStudioWorkspace> {
    const detail = await fetchReading(readingId);
    return toReadingWorkspace(detail);
  }

  return {
    async loadStudio(): Promise<ReadingStudioSnapshot> {
      const { readings } = await fetchReadings();
      const history = readings.map(toReadingHistoryItem);

      if (history.length === 0) {
        return {
          activeReadingId: null,
          history,
          workspaces: {},
        };
      }

      const persistedActiveReadingId = readPersistedActiveReadingId(storage);
      const activeReadingId = history.some((reading) => reading.id === persistedActiveReadingId)
        ? (persistedActiveReadingId as string)
        : history[0].id;

      const workspace = await fetchWorkspace(activeReadingId);
      writePersistedActiveReadingId(storage, activeReadingId);

      return {
        activeReadingId,
        history,
        workspaces: {
          [activeReadingId]: workspace,
        },
      };
    },

    async setActiveReading(readingId: string): Promise<ReadingStudioWorkspace> {
      const workspace = await fetchWorkspace(readingId);
      writePersistedActiveReadingId(storage, readingId);
      return workspace;
    },

    async createReading(rootQuestion: string): Promise<ReadingStudioWorkspace> {
      const defaultDeckId = preferences.defaultDeckId;
      const defaultDeckSpecVersion = preferences.defaultDeck?.specVersion;

      if (!defaultDeckId || !defaultDeckSpecVersion) {
        throw new Error("Default deck selection is required before creating a reading.");
      }

      const created = await postCreateReading(
        {
          rootQuestion,
          deckId: defaultDeckId,
          deckSpecVersion: defaultDeckSpecVersion,
          canvasMode: "freeform",
        },
        createIdempotencyKey()
      );

      writePersistedActiveReadingId(storage, created.readingId);
      return toReadingWorkspace(created);
    },

    async applyWorkspaceAction(
      readingId: string,
      currentVersion: number,
      action: Extract<
        ReadingStudioAction,
        {
          type:
            | "workspace.modeSwitched"
            | "workspace.cardMoved"
            | "workspace.cardRotated"
            | "workspace.cardFlipped";
        }
      >
    ): Promise<ReadingStudioWorkspace> {
      const command =
        action.type === "workspace.modeSwitched"
          ? {
              commandId: createIdempotencyKey(),
              expectedVersion: currentVersion,
              type: "switch_canvas_mode" as const,
              payload: {
                canvasMode: action.mode,
              },
            }
          : action.type === "workspace.cardMoved"
            ? {
                commandId: createIdempotencyKey(),
                expectedVersion: currentVersion,
                type: "move_card" as const,
                payload: {
                  cardId: action.cardId,
                  ...(action.freeform ? { freeform: action.freeform } : {}),
                  ...(action.grid ? { grid: action.grid } : {}),
                },
              }
            : action.type === "workspace.cardRotated"
              ? {
                  commandId: createIdempotencyKey(),
                  expectedVersion: currentVersion,
                  type: "rotate_card" as const,
                  payload: {
                    cardId: action.cardId,
                    deltaDeg: action.deltaDeg,
                  },
                }
              : {
                  commandId: createIdempotencyKey(),
                  expectedVersion: currentVersion,
                  type: "flip_card" as const,
                  payload: {
                    cardId: action.cardId,
                  },
                };

      const response = await postReadingCommand(
        readingId,
        command,
        createIdempotencyKey()
      );

      return toReadingWorkspace(response.reading);
    },
  };
}
