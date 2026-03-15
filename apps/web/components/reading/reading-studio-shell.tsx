"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { ProfileShellDto, UserPreferencesDto } from "@tarology/shared";
import { AnalysisPanel } from "./analysis-panel";
import { CanvasPanel } from "./canvas-panel";
import { HistoryRail } from "./history-rail";
import { ReadingStudioTopbar } from "./reading-studio-topbar";
import { applyLayoutAction, applyWorkspaceAction } from "../../lib/reading-studio-actions";
import { createApiReadingStudioDataSource } from "../../lib/reading-studio-api-data-source";
import { groupReadingsByRecency } from "../../lib/group-readings-by-recency";
import {
  RESIZE_KEYBOARD_STEP_PX,
  coerceLayoutPreferences,
  getViewportWidth,
  isDesktopViewport,
} from "../../lib/reading-studio-layout";
import { createLocalReadingStudioPreferenceAdapter } from "../../lib/reading-studio-preferences";
import type {
  AnalysisTab,
  PanelSide,
  ReadingHistoryFilter,
  ReadingHistoryItem,
  ReadingStudioLayoutPreferences,
  ReadingStudioSnapshot,
  ReadingStudioWorkspace,
} from "../../lib/reading-studio-types";

interface CollapsedPanelRailProps {
  side: PanelSide;
  label: string;
  controlsId: string;
  onExpand: () => void;
}

interface ResizeState {
  side: PanelSide;
  startClientXPx: number;
  startWidthPx: number;
  moveEventName: "mousemove" | "pointermove";
  upEventName: "mouseup" | "pointerup";
}

interface ReadingStudioShellProps {
  profile: ProfileShellDto;
  preferences: UserPreferencesDto;
}

type StudioStatus = "loading" | "ready" | "error";
const railContextIcons: Record<PanelSide, string[]> = {
  left: ["R", "Q", "F"],
  right: ["T", "I", "C"],
};

function CollapsedPanelRail({
  side,
  label,
  controlsId,
  onExpand,
}: CollapsedPanelRailProps) {
  const glyph = side === "left" ? ">" : "<";

  return (
    <div className="reading-shell-rail">
      <button
        type="button"
        className="reading-shell-toggle"
        aria-label={`Expand ${label}`}
        aria-controls={controlsId}
        aria-expanded={false}
        onClick={onExpand}
      >
        <span aria-hidden="true">{glyph}</span>
      </button>
      <div className="reading-shell-rail-icons" aria-hidden="true">
        {railContextIcons[side].map((icon) => (
          <span key={`${side}-${icon}`} className="reading-shell-rail-icon">
            {icon}
          </span>
        ))}
      </div>
    </div>
  );
}

interface ResizeHandleProps {
  side: PanelSide;
  valuePx: number;
  minPx: number;
  maxPx: number;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onMouseDown?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
}

function ResizeHandle({
  side,
  valuePx,
  minPx,
  maxPx,
  onPointerDown,
  onMouseDown,
  onKeyDown,
}: ResizeHandleProps) {
  const label = side === "left" ? "Resize history sidebar" : "Resize analysis sidebar";

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={minPx}
      aria-valuemax={maxPx}
      aria-valuenow={valuePx}
      className={`reading-shell-resize-handle reading-shell-resize-handle-${side}`}
      onPointerDown={onPointerDown}
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
    />
  );
}

export function ReadingStudioShell({ profile, preferences }: ReadingStudioShellProps) {
  const preferenceAdapter = useMemo(
    () =>
      createLocalReadingStudioPreferenceAdapter(
        typeof window === "undefined" ? undefined : window.localStorage
      ),
    []
  );
  const dataSource = useMemo(
    () =>
      createApiReadingStudioDataSource(
        typeof window === "undefined" ? undefined : window.localStorage,
        preferences
      ),
    [preferences]
  );

  const [viewportWidth, setViewportWidth] = useState(() => getViewportWidth());
  const [layoutPreferences, setLayoutPreferences] =
    useState<ReadingStudioLayoutPreferences | null>(null);
  const [studioSnapshot, setStudioSnapshot] = useState<ReadingStudioSnapshot | null>(null);
  const [studioStatus, setStudioStatus] = useState<StudioStatus>("loading");
  const [studioErrorMessage, setStudioErrorMessage] = useState<string | null>(null);
  const [readingCreationErrorMessage, setReadingCreationErrorMessage] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] =
    useState<ReadingHistoryFilter>("all");
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("threads");
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const persistChainRef = useRef(Promise.resolve());
  const readingActivationRequestIdRef = useRef(0);
  const supportsPointerEvents =
    typeof window !== "undefined" && "PointerEvent" in window;

  useEffect(() => {
    let cancelled = false;

    async function hydrateStudio() {
      setStudioStatus("loading");
      setStudioErrorMessage(null);

      try {
        const [loadedLayoutPreferences, loadedStudioSnapshot] = await Promise.all([
          preferenceAdapter.readLayoutPreferences(),
          dataSource.loadStudio(),
        ]);

        if (cancelled) {
          return;
        }

        setLayoutPreferences(loadedLayoutPreferences);
        setStudioSnapshot(loadedStudioSnapshot);
        setStudioStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStudioErrorMessage(
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Unable to load your readings right now. Please try again."
        );
        setStudioStatus("error");
      }
    }

    void hydrateStudio();

    return () => {
      cancelled = true;
    };
  }, [dataSource, preferenceAdapter]);

  useEffect(() => {
    function handleWindowResize() {
      const nextViewportWidth = getViewportWidth();
      setViewportWidth(nextViewportWidth);
      setLayoutPreferences((current) =>
        current ? coerceLayoutPreferences(current, nextViewportWidth) : current
      );
    }

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  useEffect(() => {
    function closeDrawersOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !layoutPreferences || isDesktopViewport(viewportWidth)) {
        return;
      }

      if (!layoutPreferences.leftOpen && !layoutPreferences.rightOpen) {
        return;
      }

      const nextLayoutPreferences = {
        ...layoutPreferences,
        leftOpen: false,
        rightOpen: false,
      };

      setLayoutPreferences(nextLayoutPreferences);
      void preferenceAdapter.writeLayoutPreferences(nextLayoutPreferences);
    }

    window.addEventListener("keydown", closeDrawersOnEscape);
    return () => window.removeEventListener("keydown", closeDrawersOnEscape);
  }, [layoutPreferences, preferenceAdapter, viewportWidth]);

  useEffect(() => {
    if (!resizeState || !layoutPreferences) {
      return;
    }

    const activeResizeState = resizeState;
    const currentLayoutPreferences = layoutPreferences;

    function getResizedWidth(clientXPx: number): number {
      const deltaXPx = clientXPx - activeResizeState.startClientXPx;

      return activeResizeState.side === "left"
        ? activeResizeState.startWidthPx + deltaXPx
        : activeResizeState.startWidthPx - deltaXPx;
    }

    function handlePointerMove(event: MouseEvent | PointerEvent) {
      const nextLayoutPreferences = applyLayoutAction(
        currentLayoutPreferences,
        {
          type: "layout.panelResized",
          side: activeResizeState.side,
          widthPx: getResizedWidth(event.clientX),
        },
        viewportWidth
      );

      setLayoutPreferences(nextLayoutPreferences);
    }

    function handlePointerUp(event: MouseEvent | PointerEvent) {
      const nextLayoutPreferences = applyLayoutAction(
        currentLayoutPreferences,
        {
          type: "layout.panelResized",
          side: activeResizeState.side,
          widthPx: getResizedWidth(event.clientX),
        },
        viewportWidth
      );

      setLayoutPreferences(nextLayoutPreferences);
      setResizeState(null);
      void preferenceAdapter.writeLayoutPreferences(nextLayoutPreferences);
    }

    window.addEventListener(activeResizeState.moveEventName, handlePointerMove);
    window.addEventListener(activeResizeState.upEventName, handlePointerUp);

    return () => {
      window.removeEventListener(activeResizeState.moveEventName, handlePointerMove);
      window.removeEventListener(activeResizeState.upEventName, handlePointerUp);
    };
  }, [layoutPreferences, preferenceAdapter, resizeState, viewportWidth]);

  const isDesktop = isDesktopViewport(viewportWidth);
  const activeWorkspace =
    studioSnapshot?.activeReadingId
      ? studioSnapshot.workspaces[studioSnapshot.activeReadingId] ?? null
      : null;
  const activeReading = activeWorkspace?.reading ?? null;

  const normalizedQuery = historySearchQuery.trim().toLowerCase();
  const filteredReadings = studioSnapshot?.history.filter((reading) => {
    if (historyStatusFilter !== "all" && reading.status !== historyStatusFilter) {
      return false;
    }

    if (normalizedQuery.length === 0) {
      return true;
    }

    return reading.title.toLowerCase().includes(normalizedQuery);
  });

  const groupedReadings = groupReadingsByRecency(filteredReadings ?? []);

  function upsertHistoryItem(
    currentHistory: ReadingHistoryItem[],
    nextItem: ReadingHistoryItem
  ): ReadingHistoryItem[] {
    const remaining = currentHistory.filter((item) => item.id !== nextItem.id);
    return [nextItem, ...remaining].sort(
      (left, right) =>
        new Date(right.updatedAtIso).getTime() - new Date(left.updatedAtIso).getTime()
    );
  }

  function updateLayoutPreferences(
    nextLayoutPreferences: ReadingStudioLayoutPreferences,
    options?: { persist?: boolean }
  ) {
    setLayoutPreferences(nextLayoutPreferences);

    if (options?.persist !== false) {
      void preferenceAdapter.writeLayoutPreferences(nextLayoutPreferences);
    }
  }

  function setPanelOpen(side: PanelSide, open: boolean) {
    if (!layoutPreferences) {
      return;
    }

    const currentlyOpen = side === "left" ? layoutPreferences.leftOpen : layoutPreferences.rightOpen;
    if (currentlyOpen === open) {
      return;
    }

    updateLayoutPreferences(
      applyLayoutAction(
        layoutPreferences,
        {
          type: "layout.panelToggled",
          side,
        },
        viewportWidth
      )
    );
  }

  function togglePanel(side: PanelSide) {
    if (!layoutPreferences) {
      return;
    }

    updateLayoutPreferences(
      applyLayoutAction(
        layoutPreferences,
        {
          type: "layout.panelToggled",
          side,
        },
        viewportWidth
      )
    );
  }

  function beginResize(
    side: PanelSide,
    event: ReactMouseEvent<HTMLDivElement> | ReactPointerEvent<HTMLDivElement>
  ) {
    if (!layoutPreferences || !isDesktop) {
      return;
    }

    event.preventDefault();
    setResizeState({
      side,
      startClientXPx: event.clientX,
      startWidthPx: side === "left" ? layoutPreferences.leftWidthPx : layoutPreferences.rightWidthPx,
      moveEventName: event.type === "mousedown" ? "mousemove" : "pointermove",
      upEventName: event.type === "mousedown" ? "mouseup" : "pointerup",
    });
  }

  function handleResizeKeyDown(side: PanelSide, event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!layoutPreferences) {
      return;
    }

    let deltaWidthPx = 0;

    if (side === "left") {
      if (event.key === "ArrowRight") {
        deltaWidthPx = RESIZE_KEYBOARD_STEP_PX;
      } else if (event.key === "ArrowLeft") {
        deltaWidthPx = -RESIZE_KEYBOARD_STEP_PX;
      }
    } else if (event.key === "ArrowLeft") {
      deltaWidthPx = RESIZE_KEYBOARD_STEP_PX;
    } else if (event.key === "ArrowRight") {
      deltaWidthPx = -RESIZE_KEYBOARD_STEP_PX;
    }

    if (deltaWidthPx === 0) {
      return;
    }

    event.preventDefault();

    const nextLayoutPreferences = applyLayoutAction(
      layoutPreferences,
      {
        type: "layout.panelResized",
        side,
        widthPx:
          (side === "left"
            ? layoutPreferences.leftWidthPx
            : layoutPreferences.rightWidthPx) + deltaWidthPx,
      },
      viewportWidth
    );

    updateLayoutPreferences(nextLayoutPreferences);
  }

  async function activateReading(readingId: string) {
    if (!studioSnapshot || readingId === studioSnapshot.activeReadingId) {
      return;
    }

    const requestId = readingActivationRequestIdRef.current + 1;
    readingActivationRequestIdRef.current = requestId;
    const nextWorkspace = await dataSource.setActiveReading(readingId);

    if (requestId !== readingActivationRequestIdRef.current) {
      return;
    }

    setStudioSnapshot((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        activeReadingId: readingId,
        workspaces: {
          ...current.workspaces,
          [readingId]: nextWorkspace,
        },
      };
    });
    setSelectedCardId(null);
  }

  function commitWorkspace(
    nextWorkspace: ReadingStudioWorkspace,
    options?: {
      skipIfOlderVersion?: boolean;
    }
  ) {
    setStudioSnapshot((current) => {
      if (!current) {
        return current;
      }

      const workspaceReadingId = nextWorkspace.reading.id;
      const existingWorkspace = current.workspaces[workspaceReadingId];

      if (
        options?.skipIfOlderVersion &&
        existingWorkspace &&
        existingWorkspace.reading.version > nextWorkspace.reading.version
      ) {
        return current;
      }

      return {
        ...current,
        history: upsertHistoryItem(current.history, nextWorkspace.reading),
        workspaces: {
          ...current.workspaces,
          [workspaceReadingId]: nextWorkspace,
        },
      };
    });
  }

  async function handleNewReading() {
    const promptedQuestion = window.prompt("Root question for the new reading", "");
    if (promptedQuestion === null) {
      return;
    }

    const rootQuestion = promptedQuestion.trim().length > 0 ? promptedQuestion.trim() : "Untitled reading";
    setReadingCreationErrorMessage(null);

    try {
      const nextWorkspace = await dataSource.createReading(rootQuestion);
      setStudioSnapshot((current) => {
        return {
          activeReadingId: nextWorkspace.reading.id,
          history: upsertHistoryItem(current?.history ?? [], nextWorkspace.reading),
          workspaces: {
            ...(current?.workspaces ?? {}),
            [nextWorkspace.reading.id]: nextWorkspace,
          },
        };
      });
      setSelectedCardId(null);
    } catch (error) {
      setReadingCreationErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to create a new reading right now. Please try again."
      );
    }
  }

  function dispatchWorkspaceAction(
    action: Parameters<typeof applyWorkspaceAction>[1]
  ) {
    if (!activeWorkspace) {
      return;
    }

    const baseVersion = activeWorkspace.reading.version;
    const optimisticWorkspace = applyWorkspaceAction(activeWorkspace, action);
    commitWorkspace(optimisticWorkspace);

    persistChainRef.current = persistChainRef.current
      .then(async () => {
        const persistedWorkspace = await dataSource.applyWorkspaceAction(
          optimisticWorkspace.reading.id,
          baseVersion,
          action
        );

        commitWorkspace(persistedWorkspace, {
          skipIfOlderVersion: true,
        });
      })
      .catch(async () => {
        const reloadedWorkspace = await dataSource.setActiveReading(optimisticWorkspace.reading.id);
        commitWorkspace(reloadedWorkspace);
      });
  }

  if (studioStatus === "error") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
        <section className="surface w-full rounded-2xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Tarology v2
          </p>
          <h1 className="mt-2 text-2xl text-[var(--color-ink)]">Unable to load studio</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            {studioErrorMessage ?? "Loading your durable reading workspace failed."}
          </p>
        </section>
      </main>
    );
  }

  if (!layoutPreferences || !studioSnapshot || studioStatus === "loading") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
        <section className="surface w-full rounded-2xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Tarology v2
          </p>
          <h1 className="mt-2 text-2xl text-[var(--color-ink)]">Loading studio</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Restoring your reading workspace and saved layout.
          </p>
        </section>
      </main>
    );
  }

  if (!activeWorkspace || !activeReading || studioSnapshot.history.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-4 py-10">
        <section className="surface w-full rounded-2xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Tarology v2
          </p>
          <h1 className="mt-2 text-2xl text-[var(--color-ink)]">Start your first reading</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Your workspace is ready. Create a reading to load durable history and canvas state.
          </p>
          {readingCreationErrorMessage ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            >
              {readingCreationErrorMessage}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-6 inline-flex items-center justify-center rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
            onClick={() => void handleNewReading()}
          >
            New Reading
          </button>
        </section>
      </main>
    );
  }

  const rootStyle = {
    "--left-expanded-width": `${layoutPreferences.leftWidthPx}px`,
    "--right-expanded-width": `${layoutPreferences.rightWidthPx}px`,
  } as CSSProperties;

  return (
    <div
      className="reading-shell"
      data-left-mode={layoutPreferences.leftOpen ? "expanded" : "collapsed"}
      data-right-mode={layoutPreferences.rightOpen ? "expanded" : "collapsed"}
      data-resizing={resizeState ? "true" : "false"}
      data-desktop={isDesktop ? "true" : "false"}
      style={rootStyle}
    >
      {!isDesktop && layoutPreferences.leftOpen ? (
        <button
          type="button"
          className="reading-shell-backdrop reading-shell-backdrop-left"
          aria-label="Close history drawer backdrop"
          onClick={() => setPanelOpen("left", false)}
        />
      ) : null}
      {!isDesktop && layoutPreferences.rightOpen ? (
        <button
          type="button"
          className="reading-shell-backdrop reading-shell-backdrop-right"
          aria-label="Close analysis drawer backdrop"
          onClick={() => setPanelOpen("right", false)}
        />
      ) : null}

      <aside
        id="desktop-history-panel"
        className="reading-shell-sidebar reading-shell-sidebar-left"
        data-side="left"
        data-open={layoutPreferences.leftOpen ? "true" : "false"}
        aria-hidden={!isDesktop && !layoutPreferences.leftOpen}
      >
        {layoutPreferences.leftOpen ? (
          <>
            <div className="reading-shell-sidebar-header">
              <button
                type="button"
                className="reading-shell-toggle"
                aria-label={isDesktop ? "Collapse history sidebar" : "Close history drawer"}
                aria-controls="desktop-history-panel"
                aria-expanded={layoutPreferences.leftOpen}
                onClick={() => togglePanel("left")}
              >
                <span aria-hidden="true">&lt;</span>
              </button>
            </div>
            <div className="reading-shell-sidebar-content">
              <HistoryRail
                profile={profile}
                preferences={preferences}
                groupedReadings={groupedReadings}
                activeReadingId={activeReading.id}
                searchQuery={historySearchQuery}
                statusFilter={historyStatusFilter}
                totalCount={studioSnapshot.history.length}
                onSearchQueryChange={setHistorySearchQuery}
                onStatusFilterChange={setHistoryStatusFilter}
                onReadingSelect={(readingId) => void activateReading(readingId)}
              />
            </div>
            {isDesktop ? (
              <ResizeHandle
                side="left"
                valuePx={layoutPreferences.leftWidthPx}
                minPx={240}
                maxPx={420}
                onPointerDown={
                  supportsPointerEvents ? (event) => beginResize("left", event) : undefined
                }
                onMouseDown={
                  supportsPointerEvents ? undefined : (event) => beginResize("left", event)
                }
                onKeyDown={(event) => handleResizeKeyDown("left", event)}
              />
            ) : null}
          </>
        ) : isDesktop ? (
          <CollapsedPanelRail
            side="left"
            label="history sidebar"
            controlsId="desktop-history-panel"
            onExpand={() => togglePanel("left")}
          />
        ) : null}
      </aside>

      <main id="reading-canvas-panel" className="reading-shell-main">
        <ReadingStudioTopbar
          activeReading={activeReading}
          isDesktop={isDesktop}
          leftCollapsed={!layoutPreferences.leftOpen}
          rightCollapsed={!layoutPreferences.rightOpen}
          onToggleDesktopHistoryPanel={() => togglePanel("left")}
          onToggleDesktopAnalysisPanel={() => togglePanel("right")}
          onOpenMobileHistoryDrawer={() => setPanelOpen("left", true)}
          onOpenMobileAnalysisDrawer={() => setPanelOpen("right", true)}
          onNewReading={() => void handleNewReading()}
        />
        {readingCreationErrorMessage ? (
          <div className="mx-auto w-full max-w-[1500px] px-4 pt-4 lg:px-8">
            <p
              role="alert"
              className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            >
              {readingCreationErrorMessage}
            </p>
          </div>
        ) : null}
        <CanvasPanel
          workspace={activeWorkspace}
          selectedCardId={selectedCardId}
          onOpenLeftPanel={() => setPanelOpen("left", true)}
          onOpenRightPanel={() => setPanelOpen("right", true)}
          onSelectCard={setSelectedCardId}
          onModeChange={(mode) =>
            dispatchWorkspaceAction({
              type: "workspace.modeSwitched",
              mode,
            })
          }
          onMoveCard={(cardId, payload) =>
            dispatchWorkspaceAction({
              type: "workspace.cardMoved",
              cardId,
              ...payload,
            })
          }
          onRotateCard={(cardId, deltaDeg) =>
            dispatchWorkspaceAction({
              type: "workspace.cardRotated",
              cardId,
              deltaDeg,
            })
          }
          onFlipCard={(cardId) =>
            dispatchWorkspaceAction({
              type: "workspace.cardFlipped",
              cardId,
            })
          }
        />
      </main>

      <aside
        id="desktop-analysis-panel"
        className="reading-shell-sidebar reading-shell-sidebar-right"
        data-side="right"
        data-open={layoutPreferences.rightOpen ? "true" : "false"}
        aria-hidden={!isDesktop && !layoutPreferences.rightOpen}
      >
        {layoutPreferences.rightOpen ? (
          <>
            <div className="reading-shell-sidebar-header">
              <button
                type="button"
                className="reading-shell-toggle"
                aria-label={isDesktop ? "Collapse analysis sidebar" : "Close analysis drawer"}
                aria-controls="desktop-analysis-panel"
                aria-expanded={layoutPreferences.rightOpen}
                onClick={() => togglePanel("right")}
              >
                <span aria-hidden="true">&gt;</span>
              </button>
            </div>
            <div className="reading-shell-sidebar-content">
              <AnalysisPanel
                activeTab={analysisTab}
                threads={activeWorkspace.threads}
                interpretations={activeWorkspace.interpretations}
                onTabChange={setAnalysisTab}
              />
            </div>
            {isDesktop ? (
              <ResizeHandle
                side="right"
                valuePx={layoutPreferences.rightWidthPx}
                minPx={280}
                maxPx={460}
                onPointerDown={
                  supportsPointerEvents ? (event) => beginResize("right", event) : undefined
                }
                onMouseDown={
                  supportsPointerEvents ? undefined : (event) => beginResize("right", event)
                }
                onKeyDown={(event) => handleResizeKeyDown("right", event)}
              />
            ) : null}
          </>
        ) : isDesktop ? (
          <CollapsedPanelRail
            side="right"
            label="analysis sidebar"
            controlsId="desktop-analysis-panel"
            onExpand={() => togglePanel("right")}
          />
        ) : null}
      </aside>
    </div>
  );
}
