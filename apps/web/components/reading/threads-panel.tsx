import type {
  InterpretationHistoryItem,
  QuestionThreadItem,
} from "../../lib/reading-studio-mock";

interface ThreadsPanelProps {
  threads: QuestionThreadItem[];
  interpretations: InterpretationHistoryItem[];
}

export function ThreadsPanel({ threads, interpretations }: ThreadsPanelProps) {
  return (
    <section aria-label="Reading analysis panels" className="reading-sidebar-block">
      <section aria-labelledby="thread-tree-title" className="reading-sidebar-section">
        <h2 id="thread-tree-title" className="reading-sidebar-title">
          Question Threads
        </h2>
        <ul className="reading-sidebar-list">
          {threads.map((thread) => (
            <li key={thread.id}>
              <article
                className="reading-sidebar-item"
                style={{ marginLeft: `${thread.depth * 0.7}rem` }}
              >
                <h3 className="reading-sidebar-item-title">{thread.label}</h3>
                <p className="reading-sidebar-item-meta">{thread.updatedAtLabel}</p>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="interpretation-history-title" className="reading-sidebar-section">
        <h2 id="interpretation-history-title" className="reading-sidebar-title">
          Interpretation History
        </h2>
        <ul className="reading-sidebar-list">
          {interpretations.map((item) => (
            <li key={item.id}>
              <article className="reading-sidebar-item">
                <h3 className="reading-sidebar-item-title">{item.groupName}</h3>
                <p className="reading-sidebar-item-meta">
                  {item.createdAtLabel} · {item.status} · {item.citationCount} citations
                </p>
                <p className="reading-sidebar-item-summary">{item.summary}</p>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
