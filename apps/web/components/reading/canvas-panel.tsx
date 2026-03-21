import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  CANVAS_ZOOM_STEP,
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
  DEFAULT_CANVAS_ZOOM,
  GRID_GAP_PX,
  GRID_PADDING_PX,
  clampCanvasZoom,
  clampFreeformPosition,
  getGridCellSize,
  resolveCanvasMetrics,
  resolveCanvasWorldMetrics,
  resolveFitCanvasZoom,
  resolveGridPixelPosition,
  resolveScaledCanvasMetrics,
  resolveViewportRevealScroll,
  snapGridPosition,
  type CanvasMetrics,
  type CanvasScrollPosition,
} from "../../lib/reading-studio-canvas";
import type {
  CanvasMode,
  ReadingCanvasCard,
  ReadingStudioWorkspace,
} from "../../lib/reading-studio-types";

interface CanvasPanelProps {
  workspace: ReadingStudioWorkspace;
  selectedCardId: string | null;
  layoutSignature: string;
  isLayoutResizing: boolean;
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
  moveEventName: "mousemove" | "pointermove";
  upEventName: "mouseup" | "pointerup";
  pointerOffsetXPx: number;
  pointerOffsetYPx: number;
  metrics: CanvasMetrics;
  zoomLevel: number;
  freeform: {
    xPx: number;
    yPx: number;
  } | null;
  grid: {
    column: number;
    row: number;
  } | null;
}

interface PanState {
  moveEventName: "mousemove" | "pointermove";
  upEventName: "mouseup" | "pointerup";
  startClientXPx: number;
  startClientYPx: number;
  startScrollLeftPx: number;
  startScrollTopPx: number;
}

type DragStartEvent =
  | ReactMouseEvent<HTMLButtonElement>
  | ReactPointerEvent<HTMLButtonElement>;
type DragMoveEvent = MouseEvent | PointerEvent;
type PanStartEvent =
  | ReactMouseEvent<HTMLDivElement>
  | ReactPointerEvent<HTMLDivElement>;

function readViewportMetrics(element: HTMLDivElement | null): CanvasMetrics {
  const rect = element?.getBoundingClientRect();

  return resolveCanvasMetrics({
    widthPx: element?.clientWidth || rect?.width,
    heightPx: element?.clientHeight || rect?.height,
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

function resolveViewportPoint(
  event: Pick<DragStartEvent | DragMoveEvent | PanStartEvent, "clientX" | "clientY">,
  viewportElement: HTMLDivElement | null,
  zoomLevel: number,
  fallback: { xPx: number; yPx: number } | null
): { xPx: number; yPx: number } | null {
  const xPx = resolveClientCoordinate(event.clientX, fallback?.xPx ?? null);
  const yPx = resolveClientCoordinate(event.clientY, fallback?.yPx ?? null);

  if (xPx === null || yPx === null) {
    return null;
  }

  const rect = viewportElement?.getBoundingClientRect();
  const scrollLeftPx = viewportElement?.scrollLeft ?? 0;
  const scrollTopPx = viewportElement?.scrollTop ?? 0;
  const safeZoomLevel = clampCanvasZoom(zoomLevel);

  return {
    xPx: (scrollLeftPx + xPx - (rect?.left ?? 0)) / safeZoomLevel,
    yPx: (scrollTopPx + yPx - (rect?.top ?? 0)) / safeZoomLevel,
  };
}

function readViewportCenterWorldPoint(
  viewportElement: HTMLDivElement,
  zoomLevel: number
): { xPx: number; yPx: number } {
  const safeZoomLevel = clampCanvasZoom(zoomLevel);
  return {
    xPx: (viewportElement.scrollLeft + viewportElement.clientWidth / 2) / safeZoomLevel,
    yPx: (viewportElement.scrollTop + viewportElement.clientHeight / 2) / safeZoomLevel,
  };
}

function isTextEntryElement(element: Element | null): boolean {
  if (!element) {
    return false;
  }

  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element.hasAttribute("contenteditable")
  );
}

export function CanvasPanel({
  workspace,
  selectedCardId,
  layoutSignature,
  isLayoutResizing,
  onOpenLeftPanel,
  onOpenRightPanel,
  onSelectCard,
  onModeChange,
  onMoveCard,
  onRotateCard,
  onFlipCard,
}: CanvasPanelProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<CanvasScrollPosition | null>(null);
  const pendingViewportCenterRef = useRef<{ xPx: number; yPx: number } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePanArmed, setSpacePanArmed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_CANVAS_ZOOM);
  const [viewportMetrics, setViewportMetrics] = useState(() =>
    resolveCanvasMetrics(undefined)
  );
  const [lastInteractedCardId, setLastInteractedCardId] = useState<string | null>(null);
  const supportsPointerEvents =
    typeof window !== "undefined" && "PointerEvent" in window;

  const activeMode = workspace.canvas.activeMode;
  const renderedCards = useMemo(
    () =>
      workspace.canvas.cards.map((card) =>
        dragState?.cardId === card.id
          ? {
              ...card,
              freeform: dragState.freeform
                ? {
                    ...card.freeform,
                    xPx: dragState.freeform.xPx,
                    yPx: dragState.freeform.yPx,
                  }
                : card.freeform,
              grid: dragState.grid ?? card.grid,
            }
          : card
      ),
    [dragState, workspace.canvas.cards]
  );
  const selectedCard =
    renderedCards.find((card) => card.id === selectedCardId) ?? null;
  const contentMetrics = useMemo(
    () => resolveCanvasWorldMetrics({
      mode: activeMode,
      cards: renderedCards,
      viewportMetrics: undefined,
      zoomLevel: DEFAULT_CANVAS_ZOOM,
    }),
    [activeMode, renderedCards]
  );
  const worldMetrics = useMemo(
    () =>
      resolveCanvasWorldMetrics({
        mode: activeMode,
        cards: renderedCards,
        viewportMetrics,
        zoomLevel,
      }),
    [activeMode, renderedCards, viewportMetrics, zoomLevel]
  );
  const scaledWorldMetrics = useMemo(
    () => resolveScaledCanvasMetrics(worldMetrics, zoomLevel),
    [worldMetrics, zoomLevel]
  );

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (viewportElement) {
      viewportElement.scrollLeft = 0;
      viewportElement.scrollTop = 0;
    }

    setZoomLevel(DEFAULT_CANVAS_ZOOM);
    setLastInteractedCardId(null);
  }, [workspace.reading.id]);

  useEffect(() => {
    if (selectedCardId) {
      setLastInteractedCardId(selectedCardId);
    }
  }, [selectedCardId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== " " || event.repeat) {
        return;
      }

      const activeElement = document.activeElement;
      if (activeElement && isTextEntryElement(activeElement)) {
        return;
      }

      setSpacePanArmed(true);
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === " ") {
        setSpacePanArmed(false);
      }
    }

    function handleWindowBlur() {
      setSpacePanArmed(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) {
      return;
    }

    const measureViewport = () => {
      setViewportMetrics(readViewportMetrics(viewportElement));
    };

    measureViewport();

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => {
        measureViewport();
      });
      observer.observe(viewportElement);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", measureViewport);
    return () => window.removeEventListener("resize", measureViewport);
  }, [layoutSignature]);

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) {
      return;
    }

    const pendingScroll = pendingScrollRef.current;
    const pendingViewportCenter = pendingViewportCenterRef.current;

    if (!pendingScroll && !pendingViewportCenter) {
      return;
    }

    const frameHandle = window.requestAnimationFrame(() => {
      const nextViewport = viewportRef.current;
      if (!nextViewport) {
        return;
      }

      if (pendingScrollRef.current) {
        nextViewport.scrollLeft = pendingScrollRef.current.leftPx;
        nextViewport.scrollTop = pendingScrollRef.current.topPx;
        pendingScrollRef.current = null;
      } else if (pendingViewportCenterRef.current) {
        nextViewport.scrollLeft = Math.max(
          0,
          pendingViewportCenterRef.current.xPx * zoomLevel -
            nextViewport.clientWidth / 2
        );
        nextViewport.scrollTop = Math.max(
          0,
          pendingViewportCenterRef.current.yPx * zoomLevel -
            nextViewport.clientHeight / 2
        );
        pendingViewportCenterRef.current = null;
      }
    });

    return () => window.cancelAnimationFrame(frameHandle);
  }, [zoomLevel, scaledWorldMetrics.heightPx, scaledWorldMetrics.widthPx]);

  useEffect(() => {
    if (dragState) {
      return;
    }

    const targetCardId = selectedCardId ?? lastInteractedCardId;
    const viewportElement = viewportRef.current;
    if (!targetCardId || !viewportElement) {
      return;
    }

    const targetCard = renderedCards.find((card) => card.id === targetCardId);
    if (!targetCard) {
      return;
    }

    const targetPosition = resolveCardPosition(targetCard, activeMode, worldMetrics);
    const nextScroll = resolveViewportRevealScroll({
      viewportMetrics,
      scrollPosition: {
        leftPx: viewportElement.scrollLeft,
        topPx: viewportElement.scrollTop,
      },
      targetRect: {
        leftPx: targetPosition.xPx,
        topPx: targetPosition.yPx,
        widthPx: CARD_WIDTH_PX,
        heightPx: CARD_HEIGHT_PX,
      },
      zoomLevel,
    });

    if (!nextScroll) {
      return;
    }

    if (isLayoutResizing) {
      viewportElement.scrollLeft = nextScroll.leftPx;
      viewportElement.scrollTop = nextScroll.topPx;
      return;
    }

    if (typeof viewportElement.scrollTo === "function") {
      viewportElement.scrollTo({
        left: nextScroll.leftPx,
        top: nextScroll.topPx,
        behavior: "smooth",
      });
      return;
    }

    viewportElement.scrollLeft = nextScroll.leftPx;
    viewportElement.scrollTop = nextScroll.topPx;
  }, [
    activeMode,
    dragState,
    isLayoutResizing,
    lastInteractedCardId,
    layoutSignature,
    renderedCards,
    selectedCardId,
    viewportMetrics,
    worldMetrics,
    zoomLevel,
  ]);

  function scheduleZoom(nextZoomLevel: number, options?: {
    preserveViewportCenter?: boolean;
    scrollTo?: CanvasScrollPosition;
  }) {
    const resolvedZoomLevel = clampCanvasZoom(nextZoomLevel);
    const viewportElement = viewportRef.current;

    if (options?.scrollTo) {
      pendingScrollRef.current = options.scrollTo;
      pendingViewportCenterRef.current = null;
    } else if (options?.preserveViewportCenter !== false && viewportElement) {
      pendingViewportCenterRef.current = readViewportCenterWorldPoint(
        viewportElement,
        zoomLevel
      );
      pendingScrollRef.current = null;
    }

    setZoomLevel(resolvedZoomLevel);
  }

  function handleFitSpread() {
    const fitZoomLevel = resolveFitCanvasZoom(contentMetrics, viewportMetrics);
    scheduleZoom(fitZoomLevel, {
      preserveViewportCenter: false,
      scrollTo: {
        leftPx: 0,
        topPx: 0,
      },
    });
  }

  function handleResetView() {
    scheduleZoom(DEFAULT_CANVAS_ZOOM, {
      preserveViewportCenter: false,
      scrollTo: {
        leftPx: 0,
        topPx: 0,
      },
    });
  }

  function beginViewportPan(event: PanStartEvent) {
    const viewportElement = viewportRef.current;
    if (!viewportElement) {
      return;
    }

    const shouldStartPan =
      event.button === 1 || (event.button === 0 && spacePanArmed);
    if (!shouldStartPan) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const initialPanState: PanState = {
      moveEventName: event.type === "mousedown" ? "mousemove" : "pointermove",
      upEventName: event.type === "mousedown" ? "mouseup" : "pointerup",
      startClientXPx: event.clientX,
      startClientYPx: event.clientY,
      startScrollLeftPx: viewportElement.scrollLeft,
      startScrollTopPx: viewportElement.scrollTop,
    };

    function handlePointerMove(nextEvent: MouseEvent | PointerEvent) {
      const nextViewport = viewportRef.current;
      if (!nextViewport) {
        return;
      }

      nextViewport.scrollLeft = Math.max(
        0,
        initialPanState.startScrollLeftPx -
          (nextEvent.clientX - initialPanState.startClientXPx)
      );
      nextViewport.scrollTop = Math.max(
        0,
        initialPanState.startScrollTopPx -
          (nextEvent.clientY - initialPanState.startClientYPx)
      );
    }

    function handlePointerUp() {
      setIsPanning(false);
      window.removeEventListener(initialPanState.moveEventName, handlePointerMove);
      window.removeEventListener(initialPanState.upEventName, handlePointerUp);
    }

    setIsPanning(true);
    window.addEventListener(initialPanState.moveEventName, handlePointerMove);
    window.addEventListener(initialPanState.upEventName, handlePointerUp);
  }

  function beginCardDrag(card: ReadingCanvasCard, event: DragStartEvent) {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    onSelectCard(card.id);
    setLastInteractedCardId(card.id);

    const pointer = resolveViewportPoint(
      event,
      viewportRef.current,
      zoomLevel,
      resolveCardPosition(card, activeMode, worldMetrics)
    );

    if (!pointer) {
      return;
    }

    const currentPosition = resolveCardPosition(card, activeMode, worldMetrics);
    const moveEventName = event.type === "mousedown" ? "mousemove" : "pointermove";
    const upEventName = event.type === "mousedown" ? "mouseup" : "pointerup";

    const initialDragState: DragState = {
      cardId: card.id,
      mode: activeMode,
      moveEventName,
      upEventName,
      pointerOffsetXPx: pointer.xPx - currentPosition.xPx,
      pointerOffsetYPx: pointer.yPx - currentPosition.yPx,
      metrics: worldMetrics,
      zoomLevel,
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
      const nextPoint = resolveViewportPoint(
        nextEvent,
        viewportRef.current,
        initialDragState.zoomLevel,
        null
      );

      if (!nextPoint) {
        return;
      }

      if (initialDragState.mode === "freeform") {
        currentFreeform = clampFreeformPosition(
          {
            xPx: nextPoint.xPx - initialDragState.pointerOffsetXPx,
            yPx: nextPoint.yPx - initialDragState.pointerOffsetYPx,
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
        initialDragState.pointerOffsetXPx +
        CARD_WIDTH_PX / 2 -
        GRID_PADDING_PX;
      const relativeYPx =
        nextPoint.yPx -
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
    const position = resolveCardPosition(card, activeMode, worldMetrics);

    return {
      left: `${position.xPx}px`,
      top: `${position.yPx}px`,
      zIndex:
        activeMode === "freeform"
          ? card.freeform.stackOrder
          : card.grid.row * 10 + card.grid.column + 1,
      transform: `rotate(${card.rotationDeg}deg)`,
    };
  }

  return (
    <section
      aria-labelledby="reading-canvas-title"
      className="reading-canvas"
      data-panning={isPanning ? "true" : "false"}
    >
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
        <div className="reading-canvas-toolbar-group">
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
          <div className="reading-canvas-view-controls" role="group" aria-label="Canvas view">
            <button
              type="button"
              className="reading-canvas-toolbar-button"
              aria-label="Zoom out"
              onClick={() => scheduleZoom(zoomLevel - CANVAS_ZOOM_STEP)}
            >
              -
            </button>
            <span className="reading-canvas-zoom-readout" aria-live="polite">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              className="reading-canvas-toolbar-button"
              aria-label="Zoom in"
              onClick={() => scheduleZoom(zoomLevel + CANVAS_ZOOM_STEP)}
            >
              +
            </button>
            <button
              type="button"
              className="reading-canvas-toolbar-button"
              onClick={handleFitSpread}
            >
              Fit Spread
            </button>
            <button
              type="button"
              className="reading-canvas-toolbar-button"
              onClick={handleResetView}
            >
              Reset View
            </button>
          </div>
        </div>

        <div className="reading-canvas-toolbar-group reading-canvas-toolbar-group-end">
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
          <p className="reading-canvas-view-hint">
            Pan with middle mouse or Space + drag.
          </p>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="reading-canvas-surface"
        aria-label="Reading canvas viewport"
        data-mode={activeMode}
        data-pan-ready={spacePanArmed ? "true" : "false"}
        data-panning={isPanning ? "true" : "false"}
        onPointerDownCapture={
          supportsPointerEvents ? (event) => beginViewportPan(event) : undefined
        }
        onMouseDownCapture={
          supportsPointerEvents ? undefined : (event) => beginViewportPan(event)
        }
      >
        <div
          className="reading-canvas-stage"
          style={{
            width: `${scaledWorldMetrics.widthPx}px`,
            height: `${scaledWorldMetrics.heightPx}px`,
          }}
        >
          <div
            className="reading-canvas-world"
            data-mode={activeMode}
            style={{
              width: `${worldMetrics.widthPx}px`,
              height: `${worldMetrics.heightPx}px`,
              transform: `scale(${zoomLevel})`,
            }}
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
              <p className="reading-canvas-watermark-text">
                Tarology reflective reading studio
              </p>
            </div>

            {renderedCards.map((card) => {
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
        </div>
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
