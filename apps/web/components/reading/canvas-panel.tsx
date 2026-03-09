import type { ReadingHistoryItem } from "../../lib/reading-studio-mock";

interface CanvasPanelProps {
  reading: ReadingHistoryItem;
  onOpenLeftPanel: () => void;
  onOpenRightPanel: () => void;
}

export function CanvasPanel({
  reading,
  onOpenLeftPanel,
  onOpenRightPanel,
}: CanvasPanelProps) {
  return (
    <section aria-labelledby="reading-canvas-title" className="reading-canvas">
      <header className="reading-canvas-mobile-controls">
        <button
          type="button"
          className="reading-canvas-mobile-button"
          onClick={onOpenLeftPanel}
          aria-label="Open left panel"
        >
          History
        </button>
        <button
          type="button"
          className="reading-canvas-mobile-button"
          onClick={onOpenRightPanel}
          aria-label="Open right panel"
        >
          Threads
        </button>
      </header>

      <div className="reading-canvas-empty-state">
        <h2 id="reading-canvas-title" className="reading-canvas-title">
          Card Fan and Canvas
        </h2>
        <img
          src="/magician-logo.png"
          alt="Tarot-logy logo watermark"
          className="reading-canvas-logo"
        />
        <p className="reading-canvas-subtitle">Tarot-logy reflective reading studio</p>
        <p className="reading-canvas-meta">Current reading: {reading.title}</p>
      </div>

      <form className="reading-canvas-composer" aria-label="Reading composer">
        <label htmlFor="reading-composer-input" className="sr-only">
          Ask a reading question
        </label>
        <input
          id="reading-composer-input"
          type="text"
          className="reading-canvas-composer-input"
          placeholder="Ask a question or start a new reading..."
        />
        <button type="button" className="reading-canvas-composer-submit" disabled>
          Send
        </button>
      </form>
    </section>
  );
}
