"use client";

import { useState } from "react";
import { CanvasPanel } from "./canvas-panel";
import { HistoryRail } from "./history-rail";
import { ThreadsPanel } from "./threads-panel";
import {
  interpretationHistoryMock,
  questionThreadsMock,
  type ReadingHistoryFilter,
  readingHistoryMock,
} from "../../lib/reading-studio-mock";

const mobileTabs = [
  { id: "canvas", label: "Canvas" },
  { id: "history", label: "History" },
  { id: "threads", label: "Threads" },
] as const;

type MobileTabId = (typeof mobileTabs)[number]["id"];

function panelVisibilityClass(activeTab: MobileTabId, panelId: MobileTabId): string {
  if (activeTab === panelId) {
    return "block lg:block";
  }

  return "hidden lg:block";
}

export function ReadingStudioShell() {
  const [activeTab, setActiveTab] = useState<MobileTabId>("canvas");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<ReadingHistoryFilter>("all");

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
    <div className="pb-8 pt-6 lg:pt-8">
      <header className="mx-auto mb-4 max-w-[1400px] px-4 lg:px-8">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Reading Studio</p>
        <h1 className="mt-1 text-3xl leading-tight text-[var(--color-ink)] sm:text-4xl">
          Tarology Workspace Shell
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--color-muted)]">
          Dark workspace theme with search/filter controls in reading history and responsive studio panel navigation.
        </p>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <nav className="surface mb-4 rounded-2xl p-1 lg:hidden" aria-label="Reading studio mobile tabs">
          <div role="tablist" aria-label="Reading studio panels" className="grid grid-cols-3 gap-1">
            {mobileTabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-2 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                    isActive
                      ? "tab-active bg-[var(--color-accent)] text-black"
                      : "bg-white/[0.05] text-[var(--color-ink)] hover:bg-white/[0.1]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)_22rem]">
          <aside
            id="panel-history"
            role="tabpanel"
            aria-labelledby="tab-history"
            className={`${panelVisibilityClass(activeTab, "history")} surface stagger-enter rounded-2xl p-4`}
          >
            <HistoryRail
              readings={filteredReadings}
              activeReadingId={activeReading.id}
              searchQuery={historySearchQuery}
              statusFilter={historyStatusFilter}
              totalCount={readingHistoryMock.length}
              onSearchQueryChange={setHistorySearchQuery}
              onStatusFilterChange={setHistoryStatusFilter}
            />
          </aside>

          <main
            id="panel-canvas"
            role="tabpanel"
            aria-labelledby="tab-canvas"
            className={`${panelVisibilityClass(activeTab, "canvas")} surface-strong stagger-enter rounded-2xl p-4 sm:p-5`}
          >
            <CanvasPanel reading={activeReading} />
          </main>

          <aside
            id="panel-threads"
            role="tabpanel"
            aria-labelledby="tab-threads"
            className={`${panelVisibilityClass(activeTab, "threads")} surface stagger-enter rounded-2xl p-4`}
          >
            <ThreadsPanel threads={questionThreadsMock} interpretations={interpretationHistoryMock} />
          </aside>
        </div>
      </div>
    </div>
  );
}
