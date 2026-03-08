import type { ReadingHistoryItem } from "../../lib/reading-studio-mock";

interface HistoryRailProps {
  readings: ReadingHistoryItem[];
  activeReadingId: string;
}

const statusBadgeTone: Record<ReadingHistoryItem["status"], string> = {
  active: "bg-emerald-100 text-emerald-800",
  paused: "bg-amber-100 text-amber-800",
  complete: "bg-slate-200 text-slate-700",
};

export function HistoryRail({ readings, activeReadingId }: HistoryRailProps) {
  return (
    <section aria-labelledby="reading-history-title">
      <h2 id="reading-history-title" className="text-xl text-[var(--color-ink)]">
        Reading History
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Placeholder feed for session restore and fast switching.
      </p>

      <ul className="mt-4 space-y-2">
        {readings.map((reading) => {
          const isActive = reading.id === activeReadingId;

          return (
            <li key={reading.id}>
              <article
                className={`rounded-xl border px-3 py-3 transition ${
                  isActive
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                    : "border-[var(--color-border)] bg-white/55"
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
    </section>
  );
}
