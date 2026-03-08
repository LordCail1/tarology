import type { ReadingHistoryItem } from "../../lib/reading-studio-mock";

interface CanvasPanelProps {
  reading: ReadingHistoryItem;
}

export function CanvasPanel({ reading }: CanvasPanelProps) {
  return (
    <section aria-labelledby="reading-canvas-title" className="h-full">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="reading-canvas-title" className="text-2xl text-[var(--color-ink)]">
            Card Fan and Canvas
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Working reading: {reading.title}
          </p>
        </div>
        <span className="badge-pill">{reading.cardCount} cards selected</span>
      </header>

      <div className="canvas-grid rounded-2xl border border-[var(--color-border)] bg-black/35 p-4 sm:p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Face-down fan</p>
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
          {Array.from({ length: 10 }, (_, cardIndex) => (
            <li key={`fan-card-${cardIndex}`}>
              <div className="h-20 rounded-md border border-white/15 bg-gradient-to-br from-[#14151b] via-[#11141f] to-[#0b0d16] shadow-[0_14px_24px_rgba(0,0,0,0.45)]" />
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-xl border border-dashed border-[var(--color-border)] bg-black/30 p-4 sm:min-h-72">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Canvas area</p>
          <p className="mt-3 max-w-2xl text-sm text-[var(--color-muted)]">
            Dragged cards, group overlays, and interpretation request affordances will be layered here in the next implementation slices.
          </p>
        </div>
      </div>
    </section>
  );
}
