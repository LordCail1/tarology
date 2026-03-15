import { beforeEach, describe, expect, it } from "vitest";
import {
  READING_STUDIO_ACTIVE_READING_STORAGE_KEY,
  createLocalReadingStudioDataSource,
} from "./reading-studio-data-source";
import { readingStudioSeedSnapshot } from "./reading-studio-mock";

describe("reading-studio-data-source", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads the seed studio snapshot by default", async () => {
    const dataSource = createLocalReadingStudioDataSource(window.localStorage);
    const snapshot = await dataSource.loadStudio();

    expect(snapshot.activeReadingId).toBe(readingStudioSeedSnapshot.activeReadingId);
    expect(snapshot.history).toHaveLength(5);
  });

  it("persists workspace changes and active reading selection", async () => {
    const dataSource = createLocalReadingStudioDataSource(window.localStorage);
    const readingId = "rdg_004";
    const workspace = readingStudioSeedSnapshot.workspaces[readingId];

    await dataSource.saveWorkspace?.(readingId, {
      ...workspace,
      canvas: {
        ...workspace.canvas,
        cards: workspace.canvas.cards.map((card, index) =>
          index === 0
            ? {
                ...card,
                rotationDeg: 87,
              }
            : card
        ),
      },
    });

    const activeWorkspace = await dataSource.setActiveReading(readingId);
    const loadedSnapshot = await dataSource.loadStudio();

    expect(activeWorkspace.canvas.cards[0].rotationDeg).toBe(87);
    expect(window.localStorage.getItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY)).toBe(
      readingId
    );
    expect(loadedSnapshot.activeReadingId).toBe(readingId);
    expect(loadedSnapshot.workspaces[readingId].canvas.cards[0].rotationDeg).toBe(87);
  });
});
