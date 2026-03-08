import type { InterpretationHistoryItem } from "../../lib/reading-studio-mock";

interface InterpretationsListProps {
  interpretations: InterpretationHistoryItem[];
}

const interpretationStatusTone: Record<InterpretationHistoryItem["status"], string> = {
  ready: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/35",
  running: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/35",
  queued: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/35",
};

export function InterpretationsList({ interpretations }: InterpretationsListProps) {
  return (
    <section aria-labelledby="interpretation-history-title">
      <h2 id="interpretation-history-title" className="text-xl text-[var(--color-ink)]">
        Interpretation History
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Placeholder run outputs tied to thread + card groups.
      </p>

      <ul className="mt-4 space-y-2">
        {interpretations.map((item) => (
          <li key={item.id}>
            <article className="rounded-xl border border-[var(--color-border)] bg-white/[0.03] px-3 py-3">
              <header className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">{item.groupName}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.03em] ${interpretationStatusTone[item.status]}`}
                >
                  {item.status}
                </span>
              </header>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {item.createdAtLabel} · {item.citationCount} citations
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{item.summary}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
