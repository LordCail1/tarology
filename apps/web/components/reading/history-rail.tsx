import type {
  ReadingHistoryFilter,
  ReadingHistoryItem,
} from "../../lib/reading-studio-mock";

interface HistoryRailProps {
  readings: ReadingHistoryItem[];
  activeReadingId: string;
  searchQuery: string;
  statusFilter: ReadingHistoryFilter;
  totalCount: number;
  onSearchQueryChange: (nextQuery: string) => void;
  onStatusFilterChange: (nextFilter: ReadingHistoryFilter) => void;
}

const statusBadgeTone: Record<ReadingHistoryItem["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/35",
  paused: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/35",
  complete: "bg-zinc-500/20 text-zinc-200 ring-1 ring-zinc-300/30",
};

const filterLabels: Record<ReadingHistoryFilter, string> = {
  all: "All",
  active: "Active",
  paused: "Paused",
  complete: "Complete",
};

export function HistoryRail({
  readings,
  activeReadingId,
  searchQuery,
  statusFilter,
  totalCount,
  onSearchQueryChange,
  onStatusFilterChange,
}: HistoryRailProps) {
  const filterOrder: ReadingHistoryFilter[] = ["all", "active", "paused", "complete"];

  return (
    <section aria-labelledby="reading-history-title">
      <h2 id="reading-history-title" className="text-xl text-[var(--color-ink)]">
        Reading History
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Search and status filters for reading restore and quick switching.
      </p>

      <div className="mt-4 space-y-3">
        <label htmlFor="history-search-input" className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
          Search readings
        </label>
        <input
          id="history-search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search by title..."
          className="w-full rounded-xl border border-[var(--color-border)] bg-black/35 px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
        />

        <div aria-label="Reading status filters" className="flex flex-wrap gap-2">
          {filterOrder.map((filter) => {
            const isActiveFilter = filter === statusFilter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => onStatusFilterChange(filter)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.07em] transition ${
                  isActiveFilter
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-black"
                    : "border-[var(--color-border)] bg-black/30 text-[var(--color-muted)] hover:border-white/40 hover:text-[var(--color-ink)]"
                }`}
                aria-pressed={isActiveFilter}
              >
                {filterLabels[filter]}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--color-muted)]">
        Showing {readings.length} of {totalCount} readings
      </p>

      {readings.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-[var(--color-border)] bg-black/25 px-3 py-4 text-sm text-[var(--color-muted)]">
          No readings match current filters.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {readings.map((reading) => {
            const isActive = reading.id === activeReadingId;

            return (
              <li key={reading.id}>
                <article
                  className={`rounded-xl border px-3 py-3 transition ${
                    isActive
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-border)] bg-white/[0.03]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <header className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold leading-snug text-[var(--color-ink)]">
                      {reading.title}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.03em] ${statusBadgeTone[reading.status]}`}
                    >
                      {reading.status}
                    </span>
                  </header>
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    {reading.createdAtLabel} · {reading.cardCount} cards
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
