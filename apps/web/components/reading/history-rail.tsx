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
    <section aria-labelledby="reading-history-title" className="reading-sidebar-block">
      <h2 id="reading-history-title" className="reading-sidebar-title">
        Reading History
      </h2>

      <label htmlFor="history-search-input" className="reading-sidebar-label">
        Search readings
      </label>
      <input
        id="history-search-input"
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder="Search by title"
        className="reading-sidebar-input"
      />

      <div aria-label="Reading status filters" className="reading-sidebar-filters">
        {filterOrder.map((filter) => {
          const isActiveFilter = filter === statusFilter;

          return (
            <button
              key={filter}
              type="button"
              onClick={() => onStatusFilterChange(filter)}
              className="reading-sidebar-filter-chip"
              data-active={isActiveFilter ? "true" : "false"}
              aria-pressed={isActiveFilter}
            >
              {filterLabels[filter]}
            </button>
          );
        })}
      </div>

      <p className="reading-sidebar-count">
        Showing {readings.length} of {totalCount} readings
      </p>

      {readings.length === 0 ? (
        <p className="reading-sidebar-empty">No readings match current filters.</p>
      ) : (
        <ul className="reading-sidebar-list">
          {readings.map((reading) => {
            const isActive = reading.id === activeReadingId;

            return (
              <li key={reading.id}>
                <article
                  className="reading-sidebar-item"
                  data-active={isActive ? "true" : "false"}
                  aria-current={isActive ? "page" : undefined}
                >
                  <h3 className="reading-sidebar-item-title">{reading.title}</h3>
                  <p className="reading-sidebar-item-meta">
                    {reading.createdAtLabel} · {reading.cardCount} cards · {reading.status}
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
