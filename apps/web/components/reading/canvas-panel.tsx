import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
  GRID_GAP_PX,
  GRID_PADDING_PX,
  clampFreeformPosition,
  getGridCellSize,
  resolveCanvasMetrics,
  resolveGridPixelPosition,
  snapGridPosition,
  type CanvasMetrics,
} from "../../lib/reading-studio-canvas";
import type {
  CanvasMode,
  ReadingCanvasCard,
  ReadingStudioWorkspace,
} from "../../lib/reading-studio-types";

interface CanvasPanelProps {
  workspace: ReadingStudioWorkspace;
  selectedCardId: string | null;
  onOpenLeftPanel: () => void;
  onOpenRightPanel: () => void;
  onSelectCard: (cardId: string | null) => void;
  onModeChange: (mode: CanvasMode) => void;
  onMoveCard: (
    cardId: string,
    payload: {
      freeform?: {
        xPx: number;
        yPx: number;
      };
      grid?: {
        column: number;
        row: number;
      };
    }
  ) => void;
  onRotateCard: (cardId: string, deltaDeg: number) => void;
  onFlipCard: (cardId: string) => void;
}

interface DragState {
  cardId: string;
  mode: CanvasMode;
  canvasLeftPx: number;
  canvasTopPx: number;
  pointerOffsetXPx: number;
  pointerOffsetYPx: number;
  metrics: CanvasMetrics;
  freeform: {
    xPx: number;
    yPx: number;
  } | null;
  grid: {
    column: number;
    row: number;
  } | null;
}

type DragStartEvent =
  | ReactMouseEvent<HTMLButtonElement>
  | ReactPointerEvent<HTMLButtonElement>;
type DragMoveEvent = MouseEvent | PointerEvent;

function readCanvasMetrics(element: HTMLDivElement | null): CanvasMetrics {
  const rect = element?.getBoundingClientRect();

  return resolveCanvasMetrics({
    widthPx: rect?.width,
    heightPx: rect?.height,
  });
}

function resolveCardPosition(
  card: ReadingCanvasCard,
  mode: CanvasMode,
  metrics: CanvasMetrics
): { xPx: number; yPx: number } {
  if (mode === "grid") {
    return resolveGridPixelPosition(card.grid, metrics);
  }

  return {
    xPx: card.freeform.xPx,
    yPx: card.freeform.yPx,
  };
}

function resolveClientCoordinate(
  value: unknown,
  fallback: number | null = null
): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolveEventPoint(
  event: Pick<DragStartEvent | DragMoveEvent, "clientX" | "clientY">,
  fallback: { xPx: number; yPx: number } | null
): { xPx: number; yPx: number } | null {
  const xPx = resolveClientCoordinate(event.clientX, fallback?.xPx ?? null);
  const yPx = resolveClientCoordinate(event.clientY, fallback?.yPx ?? null);

  if (xPx === null || yPx === null) {
    return null;
  }

  return { xPx, yPx };
}

export function CanvasPanel({
  workspace,
  selectedCardId,
  onOpenLeftPanel,
  onOpenRightPanel,
  onSelectCard,
  onModeChange,
  onMoveCard,
  onRotateCard,
  onFlipCard,
}: CanvasPanelProps) {
  const canvasSurfaceRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const supportsPointerEvents =
    typeof window !== "undefined" && "PointerEvent" in window;

  const activeMode = workspace.canvas.activeMode;
  const selectedCard =
    workspace.canvas.cards.find((card) => card.id === selectedCardId) ?? null;

  function beginCardDrag(card: ReadingCanvasCard, event: DragStartEvent) {
    event.stopPropagation();
    event.preventDefault();
    onSelectCard(card.id);

    const metrics = readCanvasMetrics(canvasSurfaceRef.current);
    const canvasRect = canvasSurfaceRef.current?.getBoundingClientRect();
    const cardRect = event.currentTarget.getBoundingClientRect();
    const currentPosition = resolveCardPosition(card, activeMode, metrics);
    const cardLeftPx =
      cardRect.width > 0 ? cardRect.left : (canvasRect?.left ?? 0) + currentPosition.xPx;
    const cardTopPx =
      cardRect.height > 0 ? cardRect.top : (canvasRect?.top ?? 0) + currentPosition.yPx;
    const pointer = resolveEventPoint(event, {
      xPx: cardLeftPx,
      yPx: cardTopPx,
    });

    if (!pointer) {
      return;
    }

    const moveEventName = event.type === "mousedown" ? "mousemove" : "pointermove";
    const upEventName = event.type === "mousedown" ? "mouseup" : "pointerup";

    const initialDragState: DragState = {
      cardId: card.id,
      mode: activeMode,
      canvasLeftPx: canvasRect?.left ?? 0,
      canvasTopPx: canvasRect?.top ?? 0,
      pointerOffsetXPx: pointer.xPx - cardLeftPx,
      pointerOffsetYPx: pointer.yPx - cardTopPx,
      metrics,
      freeform:
        activeMode === "freeform"
          ? {
              xPx: card.freeform.xPx,
              yPx: card.freeform.yPx,
            }
          : null,
      grid:
        activeMode === "grid"
          ? {
              column: card.grid.column,
              row: card.grid.row,
            }
          : null,
    };

    let currentFreeform = initialDragState.freeform;
    let currentGrid = initialDragState.grid;

    function handlePointerMove(nextEvent: DragMoveEvent) {
      const nextPoint = resolveEventPoint(nextEvent, null);

      if (!nextPoint) {
        return;
      }

      if (initialDragState.mode === "freeform") {
        currentFreeform = clampFreeformPosition(
          {
            xPx:
              nextPoint.xPx -
              initialDragState.canvasLeftPx -
              initialDragState.pointerOffsetXPx,
            yPx:
              nextPoint.yPx -
              initialDragState.canvasTopPx -
              initialDragState.pointerOffsetYPx,
          },
          initialDragState.metrics
        );

        setDragState({
          ...initialDragState,
          freeform: currentFreeform,
          grid: currentGrid,
        });
        return;
      }

      const { cellWidthPx, cellHeightPx } = getGridCellSize(initialDragState.metrics);
      const relativeXPx =
        nextPoint.xPx -
        initialDragState.canvasLeftPx -
        initialDragState.pointerOffsetXPx +
        CARD_WIDTH_PX / 2 -
        GRID_PADDING_PX;
      const relativeYPx =
        nextPoint.yPx -
        initialDragState.canvasTopPx -
        initialDragState.pointerOffsetYPx +
        CARD_HEIGHT_PX / 2 -
        GRID_PADDING_PX;

      currentGrid = snapGridPosition(
        {
          column: Math.round(relativeXPx / (cellWidthPx + GRID_GAP_PX)),
          row: Math.round(relativeYPx / (cellHeightPx + GRID_GAP_PX)),
        },
        initialDragState.metrics
      );

      setDragState({
        ...initialDragState,
        freeform: currentFreeform,
        grid: currentGrid,
      });
    }

    function handlePointerUp() {
      if (initialDragState.mode === "freeform" && currentFreeform) {
        onMoveCard(initialDragState.cardId, {
          freeform: currentFreeform,
        });
      }

      if (initialDragState.mode === "grid" && currentGrid) {
        onMoveCard(initialDragState.cardId, {
          grid: currentGrid,
        });
      }

      setDragState(null);
      window.removeEventListener(moveEventName, handlePointerMove);
      window.removeEventListener(upEventName, handlePointerUp);
    }

    setDragState(initialDragState);
    window.addEventListener(moveEventName, handlePointerMove);
    window.addEventListener(upEventName, handlePointerUp);
  }

  function resolveCardStyle(card: ReadingCanvasCard) {
    const metrics = readCanvasMetrics(canvasSurfaceRef.current);
    const position =
      dragState?.cardId === card.id
        ? activeMode === "grid"
          ? resolveGridPixelPosition(dragState.grid ?? card.grid, dragState.metrics)
          : dragState.freeform ?? {
              xPx: card.freeform.xPx,
              yPx: card.freeform.yPx,
            }
        : resolveCardPosition(card, activeMode, metrics);

    return {
      left: `${position.xPx}px`,
      top: `${position.yPx}px`,
      zIndex:
        activeMode === "freeform"
          ? dragState?.cardId === card.id
            ? 999
            : card.freeform.stackOrder
          : dragState?.cardId === card.id
            ? (dragState.grid?.row ?? card.grid.row) * 10 +
              (dragState.grid?.column ?? card.grid.column) +
              1
            : card.grid.row * 10 + card.grid.column + 1,
      transform: `rotate(${card.rotationDeg}deg)`,
    };
  }

  return (
    <section aria-labelledby="reading-canvas-title" className="reading-canvas">
      <header className="reading-canvas-mobile-controls">
        <button
          type="button"
          className="reading-canvas-mobile-button"
          onClick={onOpenLeftPanel}
          aria-label="Open history panel"
        >
          History
        </button>
        <button
          type="button"
          className="reading-canvas-mobile-button"
          onClick={onOpenRightPanel}
          aria-label="Open analysis panel"
        >
          Analysis
        </button>
      </header>

      <div className="reading-canvas-toolbar" role="toolbar" aria-label="Canvas controls">
        <div className="reading-canvas-mode-switch" role="group" aria-label="Canvas mode">
          <button
            type="button"
            className="reading-canvas-mode-button"
            data-active={activeMode === "freeform" ? "true" : "false"}
            onClick={() => onModeChange("freeform")}
          >
            Freeform
          </button>
          <button
            type="button"
            className="reading-canvas-mode-button"
            data-active={activeMode === "grid" ? "true" : "false"}
            onClick={() => onModeChange("grid")}
          >
            Grid
          </button>
        </div>

        <div className="reading-canvas-toolbar-actions">
          <button
            type="button"
            className="reading-canvas-toolbar-button"
            onClick={() => selectedCard && onFlipCard(selectedCard.id)}
            disabled={!selectedCard}
          >
            Flip
          </button>
          <button
            type="button"
            className="reading-canvas-toolbar-button"
            onClick={() => selectedCard && onRotateCard(selectedCard.id, -15)}
            disabled={!selectedCard}
          >
            Rotate -15°
          </button>
          <button
            type="button"
            className="reading-canvas-toolbar-button"
            onClick={() => selectedCard && onRotateCard(selectedCard.id, 15)}
            disabled={!selectedCard}
          >
            Rotate +15°
          </button>
          <button
            type="button"
            className="reading-canvas-toolbar-button"
            onClick={() => onSelectCard(null)}
          >
            Clear Selection
          </button>
        </div>
      </div>

      <div
        ref={canvasSurfaceRef}
        className="reading-canvas-surface"
        data-mode={activeMode}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onSelectCard(null);
          }
        }}
        onMouseDown={(event) => {
          if (!supportsPointerEvents && event.target === event.currentTarget) {
            onSelectCard(null);
          }
        }}
      >
        <div className="reading-canvas-watermark" aria-hidden="true">
          <img
            src="/magician-logo.png"
            alt=""
            className="reading-canvas-watermark-image"
          />
          <p className="reading-canvas-watermark-text">Tarot-logy reflective reading studio</p>
        </div>

        {workspace.canvas.cards.map((card) => {
          const isSelected = card.id === selectedCardId;

          return (
            <button
              key={card.id}
              type="button"
              aria-label={`${card.label} card`}
              aria-pressed={isSelected}
              className="reading-canvas-card"
              data-face={card.isFaceUp ? "up" : "down"}
              data-selected={isSelected ? "true" : "false"}
              style={resolveCardStyle(card)}
              onPointerDown={
                supportsPointerEvents ? (event) => beginCardDrag(card, event) : undefined
              }
              onMouseDown={
                supportsPointerEvents ? undefined : (event) => beginCardDrag(card, event)
              }
            >
              {card.isFaceUp ? (
                <>
                  <span className="reading-canvas-card-suit">Drawn Card</span>
                  <strong className="reading-canvas-card-label">{card.label}</strong>
                  <span className="reading-canvas-card-meta">
                    Rotation {card.rotationDeg}°
                  </span>
                  {card.assignedReversal ? (
                    <span className="reading-canvas-card-badge">Reversed</span>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="reading-canvas-card-suit">Face-down</span>
                  <strong className="reading-canvas-card-label">Hidden card</strong>
                  <span className="reading-canvas-card-meta">Tap Flip to reveal</span>
                </>
              )}
            </button>
          );
        })}
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
