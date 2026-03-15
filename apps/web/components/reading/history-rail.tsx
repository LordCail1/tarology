import type { ProfileShellDto, UserPreferencesDto } from "@tarology/shared";
import type { HistoryGroup } from "../../lib/group-readings-by-recency";
import type { ReadingHistoryFilter } from "../../lib/reading-studio-types";

interface HistoryRailProps {
  profile: ProfileShellDto;
  preferences: UserPreferencesDto;
  groupedReadings: HistoryGroup[];
  activeReadingId: string;
  searchQuery: string;
  statusFilter: ReadingHistoryFilter;
  totalCount: number;
  onSearchQueryChange: (nextQuery: string) => void;
  onStatusFilterChange: (nextFilter: ReadingHistoryFilter) => void;
  onReadingSelect: (readingId: string) => void;
}

const filterLabels: Record<ReadingHistoryFilter, string> = {
  all: "All",
  active: "Active",
  archived: "Archived",
  deleted: "Deleted",
};

export function HistoryRail({
  profile,
  preferences,
  groupedReadings,
  activeReadingId,
  searchQuery,
  statusFilter,
  totalCount,
  onSearchQueryChange,
  onStatusFilterChange,
  onReadingSelect,
}: HistoryRailProps) {
  const filterOrder: ReadingHistoryFilter[] = ["all", "active", "archived"];
  const filteredCount = groupedReadings.reduce((count, group) => count + group.items.length, 0);
  const initials = profile.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const defaultDeckLabel = preferences.defaultDeck?.name ?? "Not set";

  return (
    <section aria-labelledby="reading-history-title" className="reading-sidebar-block">
      <article className="reading-sidebar-profile-card" aria-label="Profile summary">
        <div className="reading-sidebar-profile-header">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={`${profile.displayName} avatar`}
              className="reading-sidebar-profile-avatar"
            />
          ) : (
            <div className="reading-sidebar-profile-avatar reading-sidebar-profile-avatar-fallback">
              <span>{initials || "T"}</span>
            </div>
          )}
          <div className="reading-sidebar-profile-copy">
            <p className="reading-sidebar-profile-name">{profile.displayName}</p>
            <p className="reading-sidebar-profile-email">{profile.email}</p>
          </div>
        </div>
        <p className="reading-sidebar-profile-deck">Default deck: {defaultDeckLabel}</p>
      </article>

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
        Showing {filteredCount} of {totalCount} readings
      </p>

      {filteredCount === 0 ? (
        <p className="reading-sidebar-empty">No readings match current filters.</p>
      ) : (
        <div className="reading-sidebar-group-list">
          {groupedReadings.map((group) => (
            <section
              key={group.label}
              aria-labelledby={`reading-history-group-${group.label}`}
              className="reading-sidebar-group"
            >
              <h3
                id={`reading-history-group-${group.label}`}
                className="reading-sidebar-group-title"
              >
                {group.label}
              </h3>

              <ul className="reading-sidebar-list">
                {group.items.map((reading) => {
                  const isActive = reading.id === activeReadingId;

                  return (
                    <li key={reading.id}>
                      <button
                        type="button"
                        className="reading-sidebar-item-button"
                        onClick={() => onReadingSelect(reading.id)}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <article
                          className="reading-sidebar-item"
                          data-active={isActive ? "true" : "false"}
                        >
                          <p className="reading-sidebar-item-title">{reading.title}</p>
                          <p className="reading-sidebar-item-meta">
                            {reading.createdAtLabel} · {reading.cardCount} cards · {reading.status}
                          </p>
                        </article>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
