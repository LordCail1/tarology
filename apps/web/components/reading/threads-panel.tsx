import type {
  InterpretationHistoryItem,
  QuestionThreadItem,
} from "../../lib/reading-studio-mock";

interface ThreadsPanelProps {
  threads: QuestionThreadItem[];
  interpretations: InterpretationHistoryItem[];
}

const interpretationStatusTone: Record<InterpretationHistoryItem["status"], string> = {
  ready: "bg-emerald-100 text-emerald-800",
  running: "bg-sky-100 text-sky-800",
  queued: "bg-amber-100 text-amber-800",
};

export function ThreadsPanel({ threads, interpretations }: ThreadsPanelProps) {
  return (
    <section aria-label="Reading analysis panels" className="space-y-5">
      <section aria-labelledby="thread-tree-title">
        <h2 id="thread-tree-title" className="text-xl text-[var(--color-ink)]">
          Question Threads
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Root and follow-up prompts saved against reading state.
        </p>

        <ul className="mt-4 space-y-2">
          {threads.map((thread) => (
            <li key={thread.id}>
              <article
                className="rounded-xl border border-[var(--color-border)] bg-white/60 px-3 py-2"
                style={{ marginLeft: `${thread.depth * 0.8}rem` }}
              >
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">{thread.label}</h3>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{thread.updatedAtLabel}</p>
              </article>
            </li>
          ))}
        </ul>
      </section>

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
              <article className="rounded-xl border border-[var(--color-border)] bg-white/60 px-3 py-3">
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
    </section>
  );
}
