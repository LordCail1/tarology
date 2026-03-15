import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { READING_STUDIO_ACTIVE_READING_STORAGE_KEY } from "../../lib/reading-studio-data-source";
import { READING_STUDIO_LAYOUT_STORAGE_KEY } from "../../lib/reading-studio-preferences";
import { applyWorkspaceAction } from "../../lib/reading-studio-actions";
import { readingStudioSeedSnapshot } from "../../lib/reading-studio-mock";
import type {
  ReadingStudioAction,
  ReadingStudioSnapshot,
  ReadingStudioWorkspace,
} from "../../lib/reading-studio-types";
import { ReadingStudioShell } from "./reading-studio-shell";

type PersistedWorkspaceAction = Extract<
  ReadingStudioAction,
  {
    type:
      | "workspace.modeSwitched"
      | "workspace.cardMoved"
      | "workspace.cardRotated"
      | "workspace.cardFlipped";
  }
>;

const mockStudioState = vi.hoisted(() => ({
  snapshot: null as ReadingStudioSnapshot | null,
  createReadingOverride: null as ((rootQuestion: string) => Promise<ReadingStudioWorkspace>) | null,
  setActiveReadingOverride: null as ((readingId: string) => Promise<ReadingStudioWorkspace>) | null,
  applyWorkspaceActionOverride: null as ((
    readingId: string,
    currentVersion: number,
    action: PersistedWorkspaceAction
  ) => Promise<ReadingStudioWorkspace>) | null,
}));

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

function upsertWorkspace(snapshot: ReadingStudioSnapshot, workspace: ReadingStudioWorkspace) {
  snapshot.workspaces[workspace.reading.id] = cloneValue(workspace);
  snapshot.history = [
    workspace.reading,
    ...snapshot.history.filter((reading) => reading.id !== workspace.reading.id),
  ].sort(
    (left, right) =>
      new Date(right.updatedAtIso).getTime() - new Date(left.updatedAtIso).getTime()
  );
}

vi.mock("../../lib/reading-studio-api-data-source", () => ({
  createApiReadingStudioDataSource: (storage: Storage | undefined) => ({
    async loadStudio() {
      const snapshot = cloneValue(
        mockStudioState.snapshot ?? cloneValue(readingStudioSeedSnapshot)
      );
      const persistedActiveReadingId =
        storage?.getItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY) ?? null;
      const activeReadingId =
        (persistedActiveReadingId && snapshot.workspaces[persistedActiveReadingId]
          ? persistedActiveReadingId
          : snapshot.activeReadingId) ??
        snapshot.history[0]?.id ??
        null;

      if (!activeReadingId) {
        return {
          activeReadingId: null,
          history: [],
          workspaces: {},
        };
      }

      storage?.setItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY, activeReadingId);

      return {
        activeReadingId,
        history: snapshot.history,
        workspaces: {
          [activeReadingId]: cloneValue(snapshot.workspaces[activeReadingId]),
        },
      };
    },
    async setActiveReading(readingId: string) {
      if (mockStudioState.setActiveReadingOverride) {
        return mockStudioState.setActiveReadingOverride(readingId);
      }

      const snapshot = mockStudioState.snapshot ?? cloneValue(readingStudioSeedSnapshot);
      mockStudioState.snapshot = snapshot;
      snapshot.activeReadingId = readingId;
      storage?.setItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY, readingId);
      return cloneValue(snapshot.workspaces[readingId]);
    },
    async createReading(rootQuestion: string) {
      if (mockStudioState.createReadingOverride) {
        return mockStudioState.createReadingOverride(rootQuestion);
      }

      const snapshot = mockStudioState.snapshot ?? cloneValue(readingStudioSeedSnapshot);
      mockStudioState.snapshot = snapshot;
      const template = cloneValue(
        snapshot.workspaces[snapshot.activeReadingId ?? snapshot.history[0]?.id ?? "rdg_001"]
      );
      const readingId = `rdg_test_${snapshot.history.length + 1}`;
      const nextWorkspace: ReadingStudioWorkspace = {
        ...template,
        reading: {
          ...template.reading,
          id: readingId,
          title: rootQuestion,
          version: 1,
          createdAtLabel: "Just now",
          updatedAtIso: "2026-03-15T12:00:00.000Z",
        },
      };
      upsertWorkspace(snapshot, nextWorkspace);
      snapshot.activeReadingId = readingId;
      storage?.setItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY, readingId);
      return cloneValue(nextWorkspace);
    },
    async applyWorkspaceAction(readingId: string, _currentVersion: number, action: never) {
      if (mockStudioState.applyWorkspaceActionOverride) {
        return mockStudioState.applyWorkspaceActionOverride(
          readingId,
          _currentVersion,
          action
        );
      }

      const snapshot = mockStudioState.snapshot ?? cloneValue(readingStudioSeedSnapshot);
      mockStudioState.snapshot = snapshot;
      const workspace = snapshot.workspaces[readingId];
      const nextWorkspace = applyWorkspaceAction(workspace, action);
      upsertWorkspace(snapshot, nextWorkspace);
      snapshot.activeReadingId = readingId;
      return cloneValue(nextWorkspace);
    },
  }),
}));

const profileFixture = {
  userId: "usr_123",
  email: "reader@example.com",
  displayName: "Reader Example",
  avatarUrl: null,
  provider: "google" as const,
  createdAt: "2026-03-11T10:00:00.000Z",
};

const preferencesFixture = {
  defaultDeckId: "thoth",
  defaultDeck: {
    id: "thoth",
    name: "Thoth Tarot",
    description: "Starter deck",
    specVersion: "thoth-v1",
    previewImageUrl: "/images/cards/thoth/TheSun.jpg",
    backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
    cardCount: 78,
  },
  onboardingComplete: true,
  updatedAt: "2026-03-11T10:05:00.000Z",
};

function setViewportWidth(widthPx: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: widthPx,
  });
  window.dispatchEvent(new Event("resize"));
}

async function renderHydratedShell(expectedTitle: string = "Career realignment and confidence") {
  render(<ReadingStudioShell profile={profileFixture} preferences={preferencesFixture} />);
  await screen.findByRole("heading", {
    name: expectedTitle,
    level: 1,
  });
}

function dispatchMouseDrag(
  element: HTMLElement,
  start: { clientX: number; clientY: number },
  end?: { clientX: number; clientY: number }
) {
  fireEvent.mouseDown(element, start);

  if (end) {
    fireEvent.mouseMove(window, end);
  }

  fireEvent.mouseUp(window, end ?? start);
}

describe("ReadingStudioShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setViewportWidth(1440);
    vi.restoreAllMocks();
    mockStudioState.snapshot = cloneValue(readingStudioSeedSnapshot);
    mockStudioState.createReadingOverride = null;
    mockStudioState.setActiveReadingOverride = null;
    mockStudioState.applyWorkspaceActionOverride = null;
  });

  it("renders the hydrated shell with grouped history, topbar, canvas, and analysis tabs", async () => {
    await renderHydratedShell();

    expect(screen.getByRole("heading", { name: "Reading History" })).toBeInTheDocument();
    expect(screen.getByText("Reader Example")).toBeInTheDocument();
    expect(screen.getByText("Default deck: Thoth Tarot")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Career realignment and confidence",
        level: 1,
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse history panel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand analysis panel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Freeform" })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Ask a question or start a new reading...")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand analysis panel" }));

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Threads" })).toBeInTheDocument()
    );
    expect(screen.getByRole("tab", { name: "Interpretations" })).toBeInTheDocument();
  });

  it("restores persisted layout preferences from localStorage", async () => {
    window.localStorage.setItem(
      READING_STUDIO_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        leftOpen: false,
        rightOpen: true,
        leftWidthPx: 300,
        rightWidthPx: 360,
      })
    );

    await renderHydratedShell();

    expect(screen.getByRole("button", { name: "Expand history panel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse analysis panel" })).toBeInTheDocument();
    expect(
      document.querySelector(".reading-shell")?.getAttribute("style")
    ).toContain("--left-expanded-width: 300px");
    expect(
      document.querySelector(".reading-shell")?.getAttribute("style")
    ).toContain("--right-expanded-width: 360px");
  });

  it("re-coerces desktop sidebar widths after viewport shrink", async () => {
    window.localStorage.setItem(
      READING_STUDIO_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        leftOpen: true,
        rightOpen: true,
        leftWidthPx: 420,
        rightWidthPx: 460,
      })
    );

    await renderHydratedShell();

    act(() => {
      setViewportWidth(1024);
    });

    await waitFor(() => {
      const rootStyle = document.querySelector(".reading-shell")?.getAttribute("style") ?? "";
      expect(rootStyle).toContain("--left-expanded-width: 282px");
      expect(rootStyle).toContain("--right-expanded-width: 322px");
    });
  });

  it("toggles panels and persists layout preferences", async () => {
    await renderHydratedShell();

    fireEvent.click(screen.getByRole("button", { name: "Collapse history panel" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Expand history panel" })).toBeInTheDocument()
    );

    let storedLayout = JSON.parse(
      window.localStorage.getItem(READING_STUDIO_LAYOUT_STORAGE_KEY) ?? "{}"
    );
    expect(storedLayout.leftOpen).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Expand analysis panel" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Collapse analysis panel" })).toBeInTheDocument()
    );

    storedLayout = JSON.parse(
      window.localStorage.getItem(READING_STUDIO_LAYOUT_STORAGE_KEY) ?? "{}"
    );
    expect(storedLayout.rightOpen).toBe(true);
  });

  it("supports keyboard resizing and persists panel widths", async () => {
    setViewportWidth(1680);
    await renderHydratedShell();

    const historyResizeHandle = screen.getByRole("separator", {
      name: "Resize history sidebar",
    });
    expect(historyResizeHandle).toBeInTheDocument();
    expect(
      screen.queryByRole("separator", { name: "Resize analysis sidebar" })
    ).not.toBeInTheDocument();

    fireEvent.keyDown(historyResizeHandle, { key: "ArrowRight" });

    await waitFor(() => {
      const storedLayout = JSON.parse(
        window.localStorage.getItem(READING_STUDIO_LAYOUT_STORAGE_KEY) ?? "{}"
      );
      expect(storedLayout.leftWidthPx).toBeGreaterThan(280);
    });

    fireEvent.click(screen.getByRole("button", { name: "Expand analysis panel" }));
    await waitFor(() =>
      expect(
        screen.getByRole("separator", { name: "Resize analysis sidebar" })
      ).toBeInTheDocument()
    );
  });

  it("supports drag resizing and persists panel widths on release", async () => {
    setViewportWidth(1680);
    await renderHydratedShell();

    const historyResizeHandle = screen.getByRole("separator", {
      name: "Resize history sidebar",
    });

    fireEvent.mouseDown(historyResizeHandle, { clientX: 280 });
    fireEvent.mouseMove(window, { clientX: 344 });
    fireEvent.mouseUp(window, { clientX: 344 });

    await waitFor(() => {
      const storedLayout = JSON.parse(
        window.localStorage.getItem(READING_STUDIO_LAYOUT_STORAGE_KEY) ?? "{}"
      );
      expect(storedLayout.leftWidthPx).toBe(344);
    });

    expect(document.querySelector(".reading-shell")?.getAttribute("style")).toContain(
      "--left-expanded-width: 344px"
    );
  });

  it("keeps the active reading stable when filters hide it and restores that workspace after refresh", async () => {
    const { unmount } = render(
      <ReadingStudioShell profile={profileFixture} preferences={preferencesFixture} />
    );
    await screen.findByRole("heading", { name: "Reading History" });

    fireEvent.click(screen.getByRole("button", { name: /Creative project momentum sprint/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Creative project momentum sprint" })
      ).toBeInTheDocument()
    );

    const activeCard = screen.getByRole("button", { name: "The Magician card" });
    dispatchMouseDrag(activeCard, { clientX: 50, clientY: 80 });
    await waitFor(() => expect(activeCard).toHaveAttribute("aria-pressed", "true"));
    fireEvent.click(screen.getByRole("button", { name: "Rotate +15°" }));

    await waitFor(() =>
      expect(within(activeCard).getByText("Rotation 36°")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText("Search readings"), {
      target: { value: "Career" },
    });

    expect(
      screen.getByRole("heading", { name: "Creative project momentum sprint" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Creative project momentum sprint/i })
    ).not.toBeInTheDocument();

    unmount();

    await renderHydratedShell("Creative project momentum sprint");

    expect(
      screen.getByRole("heading", { name: "Creative project momentum sprint" })
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: "The Magician card" })).getByText(
        "Rotation 36°"
      )
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY)).toBe(
      "rdg_004"
    );
  });

  it("keeps async persistence scoped to the originating reading after switching readings", async () => {
    const snapshot = cloneValue(readingStudioSeedSnapshot);
    const deferredPersist = createDeferred<ReadingStudioWorkspace>();
    let pendingWorkspace: ReadingStudioWorkspace | null = null;

    mockStudioState.snapshot = snapshot;
    mockStudioState.applyWorkspaceActionOverride = async (readingId, _currentVersion, action) => {
      const nextWorkspace = applyWorkspaceAction(snapshot.workspaces[readingId], action);
      upsertWorkspace(snapshot, nextWorkspace);
      pendingWorkspace = cloneValue(nextWorkspace);
      return deferredPersist.promise;
    };

    await renderHydratedShell();

    const activeCard = screen.getByRole("button", { name: "The Magician card" });
    dispatchMouseDrag(activeCard, { clientX: 50, clientY: 80 });
    await waitFor(() => expect(activeCard).toHaveAttribute("aria-pressed", "true"));
    fireEvent.click(screen.getByRole("button", { name: "Rotate +15°" }));

    await waitFor(() =>
      expect(
        within(screen.getByRole("button", { name: "The Magician card" })).getByText("Rotation 15°")
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Creative project momentum sprint/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Creative project momentum sprint" })
      ).toBeInTheDocument()
    );
    expect(
      within(screen.getByRole("button", { name: "The Magician card" })).getByText("Rotation 21°")
    ).toBeInTheDocument();

    await act(async () => {
      deferredPersist.resolve(cloneValue(pendingWorkspace as ReadingStudioWorkspace));
      await deferredPersist.promise;
    });

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Creative project momentum sprint" })
      ).toBeInTheDocument()
    );
    expect(
      within(screen.getByRole("button", { name: "The Magician card" })).getByText("Rotation 21°")
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY)).toBe(
      "rdg_004"
    );
  });

  it("ignores stale activation responses when reading fetches resolve out of order", async () => {
    const snapshot = cloneValue(readingStudioSeedSnapshot);
    const deferredReadingFour = createDeferred<ReadingStudioWorkspace>();
    const deferredReadingThree = createDeferred<ReadingStudioWorkspace>();

    mockStudioState.snapshot = snapshot;
    mockStudioState.setActiveReadingOverride = async (readingId) => {
      if (readingId === "rdg_004") {
        return deferredReadingFour.promise;
      }

      if (readingId === "rdg_003") {
        return deferredReadingThree.promise;
      }

      throw new Error(`Unexpected reading activation: ${readingId}`);
    };

    await renderHydratedShell();

    fireEvent.click(screen.getByRole("button", { name: /Creative project momentum sprint/i }));
    fireEvent.click(screen.getByRole("button", { name: /Spring direction spread/i }));

    await act(async () => {
      deferredReadingThree.resolve(cloneValue(snapshot.workspaces.rdg_003));
      await deferredReadingThree.promise;
    });

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Spring direction spread" })).toBeInTheDocument()
    );

    await act(async () => {
      deferredReadingFour.resolve(cloneValue(snapshot.workspaces.rdg_004));
      await deferredReadingFour.promise;
    });

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Spring direction spread" })).toBeInTheDocument()
    );
    expect(
      screen.queryByRole("heading", { name: "Creative project momentum sprint" })
    ).not.toBeInTheDocument();
  });

  it("shows a recoverable message when activating a reading fails", async () => {
    mockStudioState.setActiveReadingOverride = async () => {
      throw new Error("Unable to open that reading right now. Please try again.");
    };

    await renderHydratedShell();

    fireEvent.click(screen.getByRole("button", { name: /Creative project momentum sprint/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to open that reading right now. Please try again."
      )
    );
    expect(
      screen.getByRole("heading", { name: "Career realignment and confidence" })
    ).toBeInTheDocument();
  });

  it("drops stale persisted workspaces when newer optimistic actions already exist", async () => {
    const snapshot = cloneValue(readingStudioSeedSnapshot);
    const deferredPersistOne = createDeferred<ReadingStudioWorkspace>();
    const deferredPersistTwo = createDeferred<ReadingStudioWorkspace>();
    let callCount = 0;

    mockStudioState.snapshot = snapshot;
    mockStudioState.applyWorkspaceActionOverride = async (readingId, _currentVersion, action) => {
      callCount += 1;
      const nextWorkspace = applyWorkspaceAction(snapshot.workspaces[readingId], action);
      upsertWorkspace(snapshot, nextWorkspace);

      if (callCount === 1) {
        return deferredPersistOne.promise.then(() => cloneValue(nextWorkspace));
      }

      if (callCount === 2) {
        return deferredPersistTwo.promise.then(() => cloneValue(nextWorkspace));
      }

      throw new Error(`Unexpected persistence call ${callCount}`);
    };

    await renderHydratedShell();

    const activeCard = screen.getByRole("button", { name: "The Magician card" });
    dispatchMouseDrag(activeCard, { clientX: 50, clientY: 80 });
    await waitFor(() => expect(activeCard).toHaveAttribute("aria-pressed", "true"));

    fireEvent.click(screen.getByRole("button", { name: "Rotate +15°" }));
    await waitFor(() =>
      expect(
        within(screen.getByRole("button", { name: "The Magician card" })).getByText("Rotation 15°")
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Rotate +15°" }));
    await waitFor(() =>
      expect(
        within(screen.getByRole("button", { name: "The Magician card" })).getByText("Rotation 30°")
      ).toBeInTheDocument()
    );

    await act(async () => {
      deferredPersistOne.resolve(cloneValue(snapshot.workspaces.rdg_001));
      await deferredPersistOne.promise;
    });

    await waitFor(() =>
      expect(
        within(screen.getByRole("button", { name: "The Magician card" })).getByText("Rotation 30°")
      ).toBeInTheDocument()
    );

    await act(async () => {
      deferredPersistTwo.resolve(cloneValue(snapshot.workspaces.rdg_001));
      await deferredPersistTwo.promise;
    });

    await waitFor(() =>
      expect(
        within(screen.getByRole("button", { name: "The Magician card" })).getByText("Rotation 30°")
      ).toBeInTheDocument()
    );
  });

  it("keeps attempting persistence after a save and reload failure", async () => {
    let persistAttemptCount = 0;

    mockStudioState.applyWorkspaceActionOverride = async () => {
      persistAttemptCount += 1;
      throw new Error("Network unavailable");
    };
    mockStudioState.setActiveReadingOverride = async () => {
      throw new Error("Unable to save the latest workspace change right now. Please try again.");
    };

    await renderHydratedShell();

    const activeCard = screen.getByRole("button", { name: "The Magician card" });
    dispatchMouseDrag(activeCard, { clientX: 50, clientY: 80 });
    await waitFor(() => expect(activeCard).toHaveAttribute("aria-pressed", "true"));
    persistAttemptCount = 0;

    fireEvent.click(screen.getByRole("button", { name: "Rotate +15°" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to save the latest workspace change right now. Please try again."
      )
    );
    expect(persistAttemptCount).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Rotate +15°" }));

    await waitFor(() => expect(persistAttemptCount).toBe(2));
    await waitFor(() =>
      expect(
        within(screen.getByRole("button", { name: "The Magician card" })).getByText("Rotation 30°")
      ).toBeInTheDocument()
    );
  });

  it("shows a recoverable message when creating a reading fails", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("What needs a clearer frame?");
    mockStudioState.createReadingOverride = async () => {
      throw new Error("Unable to create a new reading right now. Please try again.");
    };

    await renderHydratedShell();

    fireEvent.click(screen.getByRole("button", { name: "New Reading" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to create a new reading right now. Please try again."
      )
    );
    expect(
      screen.getByRole("heading", { name: "Career realignment and confidence" })
    ).toBeInTheDocument();
  });

  it("uses drawer behavior on mobile and closes through backdrop and Escape", async () => {
    setViewportWidth(768);
    await renderHydratedShell();

    expect(screen.getByRole("button", { name: "Open history drawer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open analysis drawer" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expand history panel" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open analysis drawer" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Close analysis drawer backdrop" })
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Close analysis drawer backdrop" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Close analysis drawer backdrop" })
      ).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Open analysis drawer" }));
    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Close analysis drawer backdrop" })
      ).not.toBeInTheDocument()
    );
  });
});
