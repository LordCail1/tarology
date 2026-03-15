import type {
  ReadingStudioAction,
  ReadingStudioDataSource,
  ReadingStudioSnapshot,
  ReadingStudioWorkspace,
} from "./reading-studio-types";
import { readingStudioSeedSnapshot } from "./reading-studio-mock";

export const READING_STUDIO_ACTIVE_READING_STORAGE_KEY =
  "tarology.ui.readingStudioActiveReadingId";
export const READING_STUDIO_WORKSPACE_STORAGE_PREFIX = "tarology.ui.readingStudioWorkspace.";

function cloneSnapshot(snapshot: ReadingStudioSnapshot): ReadingStudioSnapshot {
  return {
    activeReadingId: snapshot.activeReadingId,
    history: snapshot.history.map((reading) => ({ ...reading })),
    workspaces: Object.fromEntries(
      Object.entries(snapshot.workspaces).map(([readingId, workspace]) => [
        readingId,
        {
          reading: { ...workspace.reading },
          threads: workspace.threads.map((thread) => ({ ...thread })),
          interpretations: workspace.interpretations.map((interpretation) => ({
            ...interpretation,
          })),
          canvas: {
            activeMode: workspace.canvas.activeMode,
            cards: workspace.canvas.cards.map((card) => ({
              ...card,
              freeform: { ...card.freeform },
              grid: { ...card.grid },
            })),
          },
        },
      ])
    ),
  };
}

function readPersistedWorkspace(
  storage: Storage | undefined,
  readingId: string
): ReadingStudioWorkspace | null {
  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(`${READING_STUDIO_WORKSPACE_STORAGE_PREFIX}${readingId}`);
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as ReadingStudioWorkspace;
  } catch {
    return null;
  }
}

export function createLocalReadingStudioDataSource(
  storage: Storage | undefined
): ReadingStudioDataSource {
  return {
    async loadStudio(): Promise<ReadingStudioSnapshot> {
      const seedSnapshot = cloneSnapshot(readingStudioSeedSnapshot);

      for (const reading of seedSnapshot.history) {
        const persistedWorkspace = readPersistedWorkspace(storage, reading.id);
        if (persistedWorkspace) {
          seedSnapshot.workspaces[reading.id] = persistedWorkspace;
        }
      }

      const persistedActiveReadingId = storage?.getItem(
        READING_STUDIO_ACTIVE_READING_STORAGE_KEY
      );

      if (
        persistedActiveReadingId &&
        seedSnapshot.workspaces[persistedActiveReadingId]
      ) {
        seedSnapshot.activeReadingId = persistedActiveReadingId;
      }

      return seedSnapshot;
    },
    async setActiveReading(readingId: string): Promise<ReadingStudioWorkspace> {
      const snapshot = await this.loadStudio();
      const workspace = snapshot.workspaces[readingId];
      const fallbackReadingId =
        snapshot.activeReadingId ?? readingStudioSeedSnapshot.history[0]?.id ?? readingId;
      const fallbackWorkspace = snapshot.workspaces[fallbackReadingId];

      if (!workspace) {
        return fallbackWorkspace;
      }

      try {
        storage?.setItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY, readingId);
      } catch {
        // Ignore storage write failures.
      }

      return workspace;
    },
    async createReading(rootQuestion: string): Promise<ReadingStudioWorkspace> {
      const seedSnapshot = cloneSnapshot(readingStudioSeedSnapshot);
      const fallbackReadingId =
        seedSnapshot.activeReadingId ?? readingStudioSeedSnapshot.history[0]?.id;

      if (!fallbackReadingId) {
        throw new Error("Reading Studio seed snapshot is empty.");
      }

      const workspace = seedSnapshot.workspaces[fallbackReadingId];

      return {
        ...workspace,
        reading: {
          ...workspace.reading,
          id: `local_${Date.now()}`,
          title: rootQuestion,
        },
      };
    },
    async applyWorkspaceAction(
      readingId: string,
      _currentVersion: number,
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
      const snapshot = await this.loadStudio();
      const workspace = snapshot.workspaces[readingId];
      const fallbackReadingId =
        snapshot.activeReadingId ?? readingStudioSeedSnapshot.history[0]?.id ?? readingId;
      const fallbackWorkspace = snapshot.workspaces[fallbackReadingId];

      if (!workspace) {
        return fallbackWorkspace;
      }

      const nextWorkspace =
        action.type === "workspace.modeSwitched" ||
        action.type === "workspace.cardMoved" ||
        action.type === "workspace.cardRotated" ||
        action.type === "workspace.cardFlipped"
          ? {
              ...workspace,
            }
          : workspace;

      if (!storage) {
        return nextWorkspace;
      }

      try {
        storage.setItem(
          `${READING_STUDIO_WORKSPACE_STORAGE_PREFIX}${readingId}`,
          JSON.stringify(nextWorkspace)
        );
      } catch {
        // Ignore storage write failures.
      }
      return nextWorkspace;
    },
    async saveWorkspace(readingId: string, workspace: ReadingStudioWorkspace): Promise<void> {
      if (!storage) {
        return;
      }

      try {
        storage.setItem(
          `${READING_STUDIO_WORKSPACE_STORAGE_PREFIX}${readingId}`,
          JSON.stringify(workspace)
        );
      } catch {
        // Ignore storage write failures.
      }
    },
  };
}
