"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalysisPanel, type RightPanelTab } from "./analysis-panel";
import { CanvasPanel } from "./canvas-panel";
import { HistoryRail } from "./history-rail";
import { ReadingStudioTopbar } from "./reading-studio-topbar";
import { groupReadingsByRecency } from "../../lib/group-readings-by-recency";
import {
  interpretationHistoryMock,
  questionThreadsMock,
  type ReadingHistoryFilter,
  readingHistoryMock,
} from "../../lib/reading-studio-mock";

export type MobileDrawerState = "none" | "history" | "analysis";

function filterReadings(searchQuery: string, statusFilter: ReadingHistoryFilter) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return readingHistoryMock.filter((reading) => {
    if (statusFilter !== "all" && reading.status !== statusFilter) {
      return false;
    }

    if (normalizedQuery.length === 0) {
      return true;
    }

    return reading.title.toLowerCase().includes(normalizedQuery);
  });
}

export function ReadingStudioShell() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<RightPanelTab>("threads");
  const [mobileDrawer, setMobileDrawer] = useState<MobileDrawerState>("none");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<ReadingHistoryFilter>("all");

  const filteredReadings = useMemo(
    () => filterReadings(historySearchQuery, historyStatusFilter),
    [historySearchQuery, historyStatusFilter]
  );

  const groupedReadings = useMemo(
    () => groupReadingsByRecency(filteredReadings),
    [filteredReadings]
  );

  const activeReading = filteredReadings[0] ?? readingHistoryMock[0];

  useEffect(() => {
    if (mobileDrawer === "none") {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileDrawer("none");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileDrawer]);

  function handleNewReading() {
    // Placeholder action until create-reading command flow is wired.
    setHistoryStatusFilter("all");
    setHistorySearchQuery("");
  }

  const desktopColumns = `${leftCollapsed ? "4.5rem" : "21rem"} minmax(0, 1fr) ${
    rightCollapsed ? "4.5rem" : "23rem"
  }`;

  return (
    <div className="pb-8">
      <ReadingStudioTopbar
        activeReading={activeReading}
        leftCollapsed={leftCollapsed}
        rightCollapsed={rightCollapsed}
        onToggleDesktopHistoryPanel={() => setLeftCollapsed((current) => !current)}
        onToggleDesktopAnalysisPanel={() => setRightCollapsed((current) => !current)}
        onOpenMobileHistoryDrawer={() => setMobileDrawer("history")}
        onOpenMobileAnalysisDrawer={() => setMobileDrawer("analysis")}
        onNewReading={handleNewReading}
      />

      <div className="mx-auto mt-4 max-w-[1500px] px-4 lg:px-8">
        <div className="lg:grid lg:items-start lg:gap-4" style={{ gridTemplateColumns: desktopColumns }}>
          <aside
            id="desktop-history-panel"
            className="surface hidden min-h-[calc(100vh-9rem)] rounded-2xl p-3 lg:block"
          >
            {leftCollapsed ? (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <button
                  type="button"
                  aria-label="Expand history panel"
                  aria-expanded="false"
                  onClick={() => setLeftCollapsed(false)}
                  className="rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-2 py-2 text-xs font-semibold text-[var(--color-ink)]"
                >
                  Open
                </button>
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)] [writing-mode:vertical-rl]">
                  History
                </span>
              </div>
            ) : (
              <HistoryRail
                groups={groupedReadings}
                activeReadingId={activeReading.id}
                searchQuery={historySearchQuery}
                statusFilter={historyStatusFilter}
                totalCount={readingHistoryMock.length}
                onSearchQueryChange={setHistorySearchQuery}
                onStatusFilterChange={setHistoryStatusFilter}
                onNewReading={handleNewReading}
              />
            )}
          </aside>

          <main className="surface-strong min-h-[calc(100vh-9rem)] rounded-2xl p-4 sm:p-5">
            <CanvasPanel reading={activeReading} />
          </main>

          <aside
            id="desktop-analysis-panel"
            className="surface hidden min-h-[calc(100vh-9rem)] rounded-2xl p-3 lg:block"
          >
            {rightCollapsed ? (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <button
                  type="button"
                  aria-label="Expand analysis panel"
                  aria-expanded="false"
                  onClick={() => setRightCollapsed(false)}
                  className="rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-2 py-2 text-xs font-semibold text-[var(--color-ink)]"
                >
                  Open
                </button>
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)] [writing-mode:vertical-rl]">
                  Analysis
                </span>
              </div>
            ) : (
              <AnalysisPanel
                activeTab={activeRightTab}
                threads={questionThreadsMock}
                interpretations={interpretationHistoryMock}
                onTabChange={setActiveRightTab}
              />
            )}
          </aside>
        </div>
      </div>

      {mobileDrawer !== "none" && (
        <div className="fixed inset-0 z-40 lg:hidden" aria-live="polite">
          <button
            type="button"
            aria-label="Close drawer backdrop"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileDrawer("none")}
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label={mobileDrawer === "history" ? "History drawer" : "Analysis drawer"}
            className={`surface absolute inset-y-0 w-[min(88vw,24rem)] overflow-y-auto p-4 ${
              mobileDrawer === "history" ? "left-0" : "right-0"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg text-[var(--color-ink)]">
                {mobileDrawer === "history" ? "History" : "Analysis"}
              </h2>
              <button
                type="button"
                onClick={() => setMobileDrawer("none")}
                className="rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-2 py-1 text-xs font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            {mobileDrawer === "history" ? (
              <HistoryRail
                groups={groupedReadings}
                activeReadingId={activeReading.id}
                searchQuery={historySearchQuery}
                statusFilter={historyStatusFilter}
                totalCount={readingHistoryMock.length}
                onSearchQueryChange={setHistorySearchQuery}
                onStatusFilterChange={setHistoryStatusFilter}
                onNewReading={handleNewReading}
              />
            ) : (
              <AnalysisPanel
                activeTab={activeRightTab}
                threads={questionThreadsMock}
                interpretations={interpretationHistoryMock}
                onTabChange={setActiveRightTab}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
