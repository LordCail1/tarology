"use client";

import { useEffect, useState } from "react";
import { CanvasPanel } from "./canvas-panel";
import { HistoryRail } from "./history-rail";
import { ThreadsPanel } from "./threads-panel";
import {
  interpretationHistoryMock,
  questionThreadsMock,
  type ReadingHistoryFilter,
  readingHistoryMock,
} from "../../lib/reading-studio-mock";
import {
  LEFT_PANEL_STORAGE_KEY,
  RIGHT_PANEL_STORAGE_KEY,
  getDefaultShellUiState,
  panelModeFromOpen,
  readShellUiState,
  type PanelSide,
  type ReadingShellUiState,
  writeShellUiState,
} from "../../lib/ui-shell-state";

interface CollapsedPanelRailProps {
  side: PanelSide;
  controlsId: string;
  onExpand: () => void;
}

const railContextIcons: Record<PanelSide, string[]> = {
  left: ["R", "Q", "F"],
  right: ["T", "I", "C"],
};

function CollapsedPanelRail({ side, controlsId, onExpand }: CollapsedPanelRailProps) {
  const sideLabel = side === "left" ? "left" : "right";
  const glyph = side === "left" ? ">" : "<";

  return (
    <div className="reading-shell-rail">
      <button
        type="button"
        className="reading-shell-toggle"
        aria-label={`Expand ${sideLabel} sidebar`}
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

function isLikelyMobileViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(max-width: 1023px)").matches;
}

export function ReadingStudioShell() {
  const [shellState, setShellState] = useState<ReadingShellUiState>(() =>
    getDefaultShellUiState()
  );
  const [didHydrateStorage, setDidHydrateStorage] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<ReadingHistoryFilter>("all");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const restoredState = readShellUiState(window.localStorage);
    const hasPersistedLeftState = window.localStorage.getItem(LEFT_PANEL_STORAGE_KEY) !== null;
    const hasPersistedRightState = window.localStorage.getItem(RIGHT_PANEL_STORAGE_KEY) !== null;

    if (!hasPersistedLeftState && !hasPersistedRightState && isLikelyMobileViewport()) {
      setShellState({ leftOpen: false, rightOpen: false });
      setDidHydrateStorage(true);
      return;
    }

    setShellState(restoredState);
    setDidHydrateStorage(true);
  }, []);

  useEffect(() => {
    if (!didHydrateStorage || typeof window === "undefined") {
      return;
    }

    writeShellUiState(window.localStorage, shellState);
  }, [didHydrateStorage, shellState]);

  useEffect(() => {
    function closeDrawersOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setShellState((current) => {
        if (!current.leftOpen && !current.rightOpen) {
          return current;
        }

        return {
          leftOpen: false,
          rightOpen: false,
        };
      });
    }

    window.addEventListener("keydown", closeDrawersOnEscape);
    return () => window.removeEventListener("keydown", closeDrawersOnEscape);
  }, []);

  function togglePanel(side: PanelSide) {
    setShellState((current) =>
      side === "left"
        ? { ...current, leftOpen: !current.leftOpen }
        : { ...current, rightOpen: !current.rightOpen }
    );
  }

  function openPanel(side: PanelSide) {
    setShellState((current) =>
      side === "left"
        ? { ...current, leftOpen: true }
        : { ...current, rightOpen: true }
    );
  }

  function closePanel(side: PanelSide) {
    setShellState((current) =>
      side === "left"
        ? { ...current, leftOpen: false }
        : { ...current, rightOpen: false }
    );
  }

  const normalizedQuery = historySearchQuery.trim().toLowerCase();
  const filteredReadings = readingHistoryMock.filter((reading) => {
    if (historyStatusFilter !== "all" && reading.status !== historyStatusFilter) {
      return false;
    }

    if (normalizedQuery.length === 0) {
      return true;
    }

    return reading.title.toLowerCase().includes(normalizedQuery);
  });

  const activeReading = filteredReadings[0] ?? readingHistoryMock[0];

  return (
    <div
      className="reading-shell"
      data-left-mode={panelModeFromOpen(shellState.leftOpen)}
      data-right-mode={panelModeFromOpen(shellState.rightOpen)}
      data-hydrated={didHydrateStorage ? "true" : "false"}
    >
      {shellState.leftOpen ? (
        <button
          type="button"
          className="reading-shell-backdrop reading-shell-backdrop-left"
          aria-label="Close left sidebar backdrop"
          onClick={() => closePanel("left")}
        />
      ) : null}
      {shellState.rightOpen ? (
        <button
          type="button"
          className="reading-shell-backdrop reading-shell-backdrop-right"
          aria-label="Close right sidebar backdrop"
          onClick={() => closePanel("right")}
        />
      ) : null}

      <aside
        id="reading-history-sidebar"
        className="reading-shell-sidebar reading-shell-sidebar-left"
        data-side="left"
        data-open={shellState.leftOpen ? "true" : "false"}
      >
        {shellState.leftOpen ? (
          <>
            <div className="reading-shell-sidebar-header">
              <button
                type="button"
                className="reading-shell-toggle"
                aria-label="Collapse left sidebar"
                aria-controls="reading-history-sidebar"
                aria-expanded={shellState.leftOpen}
                onClick={() => togglePanel("left")}
              >
                <span aria-hidden="true">&lt;</span>
              </button>
            </div>
            <div className="reading-shell-sidebar-content">
              <HistoryRail
                readings={filteredReadings}
                activeReadingId={activeReading.id}
                searchQuery={historySearchQuery}
                statusFilter={historyStatusFilter}
                totalCount={readingHistoryMock.length}
                onSearchQueryChange={setHistorySearchQuery}
                onStatusFilterChange={setHistoryStatusFilter}
              />
            </div>
          </>
        ) : (
          <CollapsedPanelRail
            side="left"
            controlsId="reading-history-sidebar"
            onExpand={() => togglePanel("left")}
          />
        )}
      </aside>

      <main id="reading-canvas-panel" className="reading-shell-main">
        <CanvasPanel
          reading={activeReading}
          onOpenLeftPanel={() => openPanel("left")}
          onOpenRightPanel={() => openPanel("right")}
        />
      </main>

      <aside
        id="reading-threads-sidebar"
        className="reading-shell-sidebar reading-shell-sidebar-right"
        data-side="right"
        data-open={shellState.rightOpen ? "true" : "false"}
      >
        {shellState.rightOpen ? (
          <>
            <div className="reading-shell-sidebar-header">
              <button
                type="button"
                className="reading-shell-toggle"
                aria-label="Collapse right sidebar"
                aria-controls="reading-threads-sidebar"
                aria-expanded={shellState.rightOpen}
                onClick={() => togglePanel("right")}
              >
                <span aria-hidden="true">&gt;</span>
              </button>
            </div>
            <div className="reading-shell-sidebar-content">
              <ThreadsPanel
                threads={questionThreadsMock}
                interpretations={interpretationHistoryMock}
              />
            </div>
          </>
        ) : (
          <CollapsedPanelRail
            side="right"
            controlsId="reading-threads-sidebar"
            onExpand={() => togglePanel("right")}
          />
        )}
      </aside>
    </div>
  );
}
