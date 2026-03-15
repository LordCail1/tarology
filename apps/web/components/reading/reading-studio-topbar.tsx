import Link from "next/link";
import type { ReadingHistoryItem } from "../../lib/reading-studio-types";

interface ReadingStudioTopbarProps {
  activeReading: ReadingHistoryItem;
  isDesktop: boolean;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  onToggleDesktopHistoryPanel: () => void;
  onToggleDesktopAnalysisPanel: () => void;
  onOpenMobileHistoryDrawer: () => void;
  onOpenMobileAnalysisDrawer: () => void;
  onNewReading: () => void;
}

export function ReadingStudioTopbar({
  activeReading,
  isDesktop,
  leftCollapsed,
  rightCollapsed,
  onToggleDesktopHistoryPanel,
  onToggleDesktopAnalysisPanel,
  onOpenMobileHistoryDrawer,
  onOpenMobileAnalysisDrawer,
  onNewReading,
}: ReadingStudioTopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Reading Studio
          </p>
          <h1 className="truncate text-base font-semibold text-[var(--color-ink)] sm:text-lg">
            {activeReading.title}
          </h1>
        </div>

        {isDesktop ? (
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/decks"
              className="rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-white/[0.08]"
            >
              Deck Library
            </Link>
            <button
              type="button"
              aria-label={leftCollapsed ? "Expand history panel" : "Collapse history panel"}
              aria-expanded={!leftCollapsed}
              aria-controls="desktop-history-panel"
              onClick={onToggleDesktopHistoryPanel}
              className="rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-white/[0.08]"
            >
              {leftCollapsed ? "Show History" : "Hide History"}
            </button>
            <button
              type="button"
              aria-label={rightCollapsed ? "Expand analysis panel" : "Collapse analysis panel"}
              aria-expanded={!rightCollapsed}
              aria-controls="desktop-analysis-panel"
              onClick={onToggleDesktopAnalysisPanel}
              className="rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-white/[0.08]"
            >
              {rightCollapsed ? "Show Analysis" : "Hide Analysis"}
            </button>
            <button
              type="button"
              onClick={onNewReading}
              disabled
              aria-disabled="true"
              className="rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)]/35 px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              New Reading
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/decks"
              className="rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)]"
            >
              Decks
            </Link>
            <button
              type="button"
              aria-label="Open history drawer"
              onClick={onOpenMobileHistoryDrawer}
              className="rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)]"
            >
              History
            </button>
            <button
              type="button"
              aria-label="Open analysis drawer"
              onClick={onOpenMobileAnalysisDrawer}
              className="rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)]"
            >
              Analysis
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
