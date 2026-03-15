import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { READING_STUDIO_ACTIVE_READING_STORAGE_KEY } from "../../lib/reading-studio-data-source";
import { READING_STUDIO_LAYOUT_STORAGE_KEY } from "../../lib/reading-studio-preferences";
import { applyWorkspaceAction } from "../../lib/reading-studio-actions";
import { readingStudioSeedSnapshot } from "../../lib/reading-studio-mock";
import type {
  ReadingStudioSnapshot,
  ReadingStudioWorkspace,
} from "../../lib/reading-studio-types";
import { ReadingStudioShell } from "./reading-studio-shell";

const mockStudioState = vi.hoisted(() => ({
  snapshot: null as ReadingStudioSnapshot | null,
}));

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
      const snapshot = mockStudioState.snapshot ?? cloneValue(readingStudioSeedSnapshot);
      mockStudioState.snapshot = snapshot;
      snapshot.activeReadingId = readingId;
      storage?.setItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY, readingId);
      return cloneValue(snapshot.workspaces[readingId]);
    },
    async createReading(rootQuestion: string) {
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
