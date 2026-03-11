import type { QuestionThreadItem } from "../../lib/reading-studio-types";

interface ThreadsListProps {
  threads: QuestionThreadItem[];
}

export function ThreadsList({ threads }: ThreadsListProps) {
  return (
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
              className="rounded-xl border border-[var(--color-border)] bg-white/[0.03] px-3 py-2"
              style={{ marginLeft: `${thread.depth * 0.8}rem` }}
            >
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">{thread.label}</h3>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{thread.updatedAtLabel}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
