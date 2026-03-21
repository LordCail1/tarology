import {
  useEffect,
  useLayoutEffect,
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
  clampInteractiveCanvasZoom,
  clampFreeformPosition,
  getDefaultFreeformViewState,
  getGridCellSize,
  resolveCanvasMetrics,
  resolveFreeformContentBounds,
  resolveFreeformFitViewState,
  resolveFreeformViewportPoint,
  resolveGridPixelPosition,
  resolveViewportCenteredFreeformViewState,
  resolveZoomedFreeformViewState,
  snapGridPosition,
  type CanvasMetrics,
  type FreeformViewState,
} from "../../lib/reading-studio-canvas";
import {
  readPersistedFreeformViewState,
  writePersistedFreeformViewState,
} from "../../lib/reading-studio-freeform-view";
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
  pointerId: number | null;
  pointerOffsetXPx: number;
  pointerOffsetYPx: number;
  freeformViewState: FreeformViewState | null;
  gridMetrics: CanvasMetrics | null;
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
  startClientXPx: number;
  startClientYPx: number;
  startPanXPx: number;
  startPanYPx: number;
  pointerId: number | null;
  requiredButtonsMask: number;
  moveEventName: "mousemove" | "pointermove";
  upEventName: "mouseup" | "pointerup";
}

interface PersistableFreeformViewSnapshot {
  readingId: string;
  viewState: FreeformViewState;
  viewportMetrics: CanvasMetrics;
}

interface PendingViewWrite extends PersistableFreeformViewSnapshot {
  timeoutHandle: number | null;
}

type DragStartEvent =
  | ReactMouseEvent<HTMLButtonElement>
  | ReactPointerEvent<HTMLButtonElement>;
type PanStartEvent =
  | ReactMouseEvent<HTMLDivElement>
  | ReactPointerEvent<HTMLDivElement>;
type DragMoveEvent = MouseEvent | PointerEvent;

function readViewportMetrics(element: HTMLDivElement | null): CanvasMetrics {
  const rect = element?.getBoundingClientRect();

  return resolveCanvasMetrics({
    widthPx: element?.clientWidth || rect?.width,
    heightPx: element?.clientHeight || rect?.height,
  });
}

function resolveClientCoordinate(
  value: unknown,
  fallback: number | null = null
): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolvePointerIdentifier(event: unknown): number | null {
  const pointerId =
    event && typeof event === "object" && "pointerId" in event
      ? (event as { pointerId?: unknown }).pointerId
      : null;

  return typeof pointerId === "number" && Number.isFinite(pointerId) ? pointerId : null;
}

function resolveReactNativeEvent(event: DragStartEvent | PanStartEvent): Event | undefined {
  return "nativeEvent" in event ? event.nativeEvent : undefined;
}

function resolveViewportPoint(options: {
  event: Pick<DragStartEvent | DragMoveEvent, "clientX" | "clientY">;
  viewportElement: HTMLDivElement | null;
  mode: CanvasMode;
  freeformViewState: FreeformViewState;
}): { xPx: number; yPx: number } | null {
  const clientXPx = resolveClientCoordinate(options.event.clientX);
  const clientYPx = resolveClientCoordinate(options.event.clientY);

  if (clientXPx === null || clientYPx === null || !options.viewportElement) {
    return null;
  }

  const viewportRect = options.viewportElement.getBoundingClientRect();

  if (options.mode === "freeform") {
    return resolveFreeformViewportPoint({
      clientXPx,
      clientYPx,
      viewportRect,
      viewState: options.freeformViewState,
    });
  }

  return {
    xPx: clientXPx - viewportRect.left,
    yPx: clientYPx - viewportRect.top,
  };
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

function isKeyboardActivationElement(element: Element | null): boolean {
  if (!element) {
    return false;
  }

  return Boolean(
    element.closest(
      'button, a[href], summary, [role="button"], [role="link"], [role="menuitem"]'
    )
  );
}

function isCardElement(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(".reading-canvas-card"));
}

function resolveWheelDeltaPx(
  value: number,
  deltaMode: number,
  pageSizePx: number
): number {
  if (!Number.isFinite(value) || value === 0) {
    return 0;
  }

  if (deltaMode === 1) {
    return value * 16;
  }

  if (deltaMode === 2) {
    return value * pageSizePx;
  }

  return value;
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
  const hasMeasuredViewportRef = useRef(false);
  const previousMeasuredViewportRef = useRef<CanvasMetrics | null>(null);
  const hydratedReadingIdRef = useRef<string | null>(null);
  const previousPersistenceContextRef = useRef<{
    readingId: string;
    isFreeformMode: boolean;
  } | null>(null);
  const latestPersistableViewRef = useRef<PersistableFreeformViewSnapshot | null>(null);
  const pendingViewWriteRef = useRef<PendingViewWrite | null>(null);
  const storageRef = useRef<Storage | undefined>(
    typeof window === "undefined" ? undefined : window.localStorage
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePanArmed, setSpacePanArmed] = useState(false);
  const activePanPointerIdRef = useRef<number | "mouse" | null>(null);
  const [viewportMetrics, setViewportMetrics] = useState(() =>
    resolveCanvasMetrics(undefined)
  );
  const [freeformViewState, setFreeformViewState] = useState<FreeformViewState>(() =>
    getDefaultFreeformViewState()
  );
  const supportsPointerEvents =
    typeof window !== "undefined" && typeof window.PointerEvent === "function";

  const activeMode = workspace.canvas.activeMode;
  const isFreeformMode = activeMode === "freeform";
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
  const gridMetrics = useMemo(
    () => resolveCanvasMetrics(viewportMetrics),
    [viewportMetrics]
  );
  const freeformBounds = useMemo(
    () => resolveFreeformContentBounds(renderedCards),
    [renderedCards]
  );
  const canPersistCurrentFreeformView =
    isFreeformMode &&
    hasMeasuredViewportRef.current &&
    (hydratedReadingIdRef.current === null ||
      hydratedReadingIdRef.current === workspace.reading.id);

  if (canPersistCurrentFreeformView) {
    latestPersistableViewRef.current = {
      readingId: workspace.reading.id,
      viewState: {
        ...freeformViewState,
      },
      viewportMetrics: resolveCanvasMetrics(viewportMetrics),
    };
  } else if (latestPersistableViewRef.current?.readingId === workspace.reading.id) {
    latestPersistableViewRef.current = null;
  }

  function flushPendingFreeformViewWrite(readingId?: string) {
    const pendingWrite = pendingViewWriteRef.current;
    const latestPersistableView = latestPersistableViewRef.current;
    const matchedLatestView =
      latestPersistableView &&
      (!readingId || latestPersistableView.readingId === readingId)
        ? latestPersistableView
        : null;
    const matchedPendingWrite =
      pendingWrite && (!readingId || pendingWrite.readingId === readingId)
        ? pendingWrite
        : null;
    if (!matchedLatestView && !matchedPendingWrite) {
      return;
    }

    const pendingTimeoutHandle = matchedPendingWrite?.timeoutHandle ?? null;
    if (pendingTimeoutHandle !== null) {
      window.clearTimeout(pendingTimeoutHandle);
    }

    if (matchedPendingWrite && matchedPendingWrite.readingId !== matchedLatestView?.readingId) {
      writePersistedFreeformViewState(
        storageRef.current,
        matchedPendingWrite.readingId,
        matchedPendingWrite.viewState,
        matchedPendingWrite.viewportMetrics
      );
    }

    const writePayload = matchedLatestView ?? matchedPendingWrite;
    if (writePayload) {
      writePersistedFreeformViewState(
        storageRef.current,
        writePayload.readingId,
        writePayload.viewState,
        writePayload.viewportMetrics
      );
    }

    if (!readingId || pendingWrite?.readingId === readingId) {
      pendingViewWriteRef.current = null;
    }
    if (!readingId || latestPersistableView?.readingId === readingId) {
      latestPersistableViewRef.current = null;
    }
  }

  useLayoutEffect(() => {
    hydratedReadingIdRef.current = null;
    setFreeformViewState(getDefaultFreeformViewState());
  }, [workspace.reading.id]);

  useLayoutEffect(() => {
    if (!isFreeformMode) {
      return;
    }

    if (hydratedReadingIdRef.current === workspace.reading.id) {
      return;
    }

    let resolvedViewportMetrics: CanvasMetrics | null = null;
    const viewportElement = viewportRef.current;
    if (viewportElement) {
      const measuredViewportMetrics = readViewportMetrics(viewportElement);
      resolvedViewportMetrics = measuredViewportMetrics;
      hasMeasuredViewportRef.current = true;

      if (
        measuredViewportMetrics.widthPx !== viewportMetrics.widthPx ||
        measuredViewportMetrics.heightPx !== viewportMetrics.heightPx
      ) {
        setViewportMetrics(measuredViewportMetrics);
      }
    } else if (hasMeasuredViewportRef.current) {
      resolvedViewportMetrics = resolveCanvasMetrics(viewportMetrics);
    }

    if (!resolvedViewportMetrics) {
      return;
    }

    const persistedViewState = readPersistedFreeformViewState(
      storageRef.current,
      workspace.reading.id,
      resolvedViewportMetrics
    );
    setFreeformViewState(persistedViewState);
    previousMeasuredViewportRef.current = resolvedViewportMetrics;
    hydratedReadingIdRef.current = workspace.reading.id;
  }, [
    isFreeformMode,
    viewportMetrics.heightPx,
    viewportMetrics.widthPx,
    workspace.reading.id,
  ]);

  useEffect(() => {
    const previousContext = previousPersistenceContextRef.current;
    if (
      previousContext &&
      (previousContext.readingId !== workspace.reading.id ||
        previousContext.isFreeformMode !== isFreeformMode)
    ) {
      flushPendingFreeformViewWrite(previousContext.readingId);
    }

    previousPersistenceContextRef.current = {
      readingId: workspace.reading.id,
      isFreeformMode,
    };
  }, [isFreeformMode, workspace.reading.id]);

  useEffect(() => {
    return () => {
      flushPendingFreeformViewWrite();
    };
  }, []);

  useEffect(() => {
    if (
      !isFreeformMode ||
      !hasMeasuredViewportRef.current ||
      hydratedReadingIdRef.current !== workspace.reading.id
    ) {
      return;
    }

    const resolvedViewportMetrics = resolveCanvasMetrics(viewportMetrics);
    const existingPendingWrite = pendingViewWriteRef.current;
    if (existingPendingWrite && existingPendingWrite.timeoutHandle !== null) {
      window.clearTimeout(existingPendingWrite.timeoutHandle);
    }

    const persistedSnapshot =
      latestPersistableViewRef.current?.readingId === workspace.reading.id
        ? latestPersistableViewRef.current
        : {
            readingId: workspace.reading.id,
            viewState: {
              ...freeformViewState,
            },
            viewportMetrics: {
              ...resolvedViewportMetrics,
            },
          };
    const pendingWrite: PendingViewWrite = {
      timeoutHandle: null,
      readingId: persistedSnapshot.readingId,
      viewState: {
        ...persistedSnapshot.viewState,
      },
      viewportMetrics: {
        ...persistedSnapshot.viewportMetrics,
      },
    };

    const timeoutHandle = window.setTimeout(() => {
      writePersistedFreeformViewState(
        storageRef.current,
        pendingWrite.readingId,
        pendingWrite.viewState,
        pendingWrite.viewportMetrics
      );
      if (pendingViewWriteRef.current === pendingWrite) {
        pendingViewWriteRef.current = null;
      }
    }, 120);
    pendingWrite.timeoutHandle = timeoutHandle;
    pendingViewWriteRef.current = pendingWrite;
  }, [
    isFreeformMode,
    freeformViewState.panXPx,
    freeformViewState.panYPx,
    freeformViewState.zoomLevel,
    viewportMetrics.heightPx,
    viewportMetrics.widthPx,
    workspace.reading.id,
  ]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isFreeformMode || event.key !== " " || event.repeat) {
        return;
      }

      const activeElement = document.activeElement;
      if (
        activeElement &&
        (isTextEntryElement(activeElement) || isKeyboardActivationElement(activeElement))
      ) {
        return;
      }

      event.preventDefault();
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
  }, [isFreeformMode]);

  useLayoutEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) {
      return;
    }

    const measureViewport = () => {
      const nextViewportMetrics = readViewportMetrics(viewportElement);

      if (!hasMeasuredViewportRef.current) {
        hasMeasuredViewportRef.current = true;
        previousMeasuredViewportRef.current = nextViewportMetrics;
      }

      setViewportMetrics(nextViewportMetrics);
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
    const previousViewportMetrics = previousMeasuredViewportRef.current;

    if (!isFreeformMode || !hasMeasuredViewportRef.current || !previousViewportMetrics) {
      return;
    }

    if (
      previousViewportMetrics.widthPx === viewportMetrics.widthPx &&
      previousViewportMetrics.heightPx === viewportMetrics.heightPx
    ) {
      return;
    }

    setFreeformViewState((current) =>
      resolveViewportCenteredFreeformViewState({
        previousViewportMetrics,
        nextViewportMetrics: viewportMetrics,
        viewState: current,
      })
    );
    previousMeasuredViewportRef.current = viewportMetrics;
  }, [isFreeformMode, viewportMetrics.heightPx, viewportMetrics.widthPx]);

  function ensureCurrentFreeformPersistenceContext() {
    if (!isFreeformMode) {
      return;
    }

    const viewportElement = viewportRef.current;
    if (viewportElement && !hasMeasuredViewportRef.current) {
      const measuredViewportMetrics = readViewportMetrics(viewportElement);
      hasMeasuredViewportRef.current = true;
      previousMeasuredViewportRef.current = measuredViewportMetrics;
      setViewportMetrics(measuredViewportMetrics);
    }

    if (hydratedReadingIdRef.current !== workspace.reading.id) {
      hydratedReadingIdRef.current = workspace.reading.id;
    }
  }

  function scheduleZoom(nextZoomLevel: number) {
    if (!isFreeformMode) {
      return;
    }

    ensureCurrentFreeformPersistenceContext();
    const viewportElement = viewportRef.current;
    const anchorPointPx = viewportElement
      ? {
          xPx: viewportElement.clientWidth / 2,
          yPx: viewportElement.clientHeight / 2,
        }
      : {
          xPx: viewportMetrics.widthPx / 2,
          yPx: viewportMetrics.heightPx / 2,
        };

    setFreeformViewState((current) =>
      resolveZoomedFreeformViewState({
        current,
        nextZoomLevel: clampInteractiveCanvasZoom({
          currentZoom: current.zoomLevel,
          proposedZoom: nextZoomLevel,
        }),
        anchorPointPx,
      })
    );
  }

  function handleFitSpread() {
    if (!isFreeformMode) {
      return;
    }

    ensureCurrentFreeformPersistenceContext();
    setFreeformViewState(
      resolveFreeformFitViewState({
        bounds: freeformBounds,
        viewportMetrics,
      })
    );
  }

  function handleResetView() {
    if (!isFreeformMode) {
      return;
    }

    ensureCurrentFreeformPersistenceContext();
    setFreeformViewState(getDefaultFreeformViewState());
  }

  function applyViewportWheel(event: {
    deltaX: number;
    deltaY: number;
    deltaMode: number;
    ctrlKey: boolean;
    metaKey: boolean;
    clientX: number;
    clientY: number;
    preventDefault: () => void;
  }) {
    const viewportElement = viewportRef.current;

    if (!viewportElement || !isFreeformMode || (!event.deltaX && !event.deltaY)) {
      return;
    }

    ensureCurrentFreeformPersistenceContext();
    event.preventDefault();

    const deltaXPx = resolveWheelDeltaPx(
      event.deltaX,
      event.deltaMode,
      viewportElement.clientWidth
    );
    const deltaYPx = resolveWheelDeltaPx(
      event.deltaY,
      event.deltaMode,
      viewportElement.clientHeight
    );

    if (event.ctrlKey || event.metaKey) {
      const viewportRect = viewportElement.getBoundingClientRect();
      const anchorPointPx = {
        xPx: event.clientX - viewportRect.left,
        yPx: event.clientY - viewportRect.top,
      };
      const zoomDeltaPx = deltaYPx !== 0 ? deltaYPx : deltaXPx;

      setFreeformViewState((current) =>
        resolveZoomedFreeformViewState({
          current,
          nextZoomLevel: clampInteractiveCanvasZoom({
            currentZoom: current.zoomLevel,
            proposedZoom: current.zoomLevel * Math.exp(-zoomDeltaPx / 400),
          }),
          anchorPointPx,
        })
      );
      return;
    }

    setFreeformViewState((current) => ({
      ...current,
      panXPx: current.panXPx - deltaXPx,
      panYPx: current.panYPx - deltaYPx,
    }));
  }

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      applyViewportWheel(event);
    };

    viewportElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewportElement.removeEventListener("wheel", handleWheel);
  }, [freeformViewState.zoomLevel, isFreeformMode]);

  function beginViewportPan(
    event: PanStartEvent,
    options?: {
      allowPrimaryButton?: boolean;
    }
  ): boolean {
    if (!isFreeformMode) {
      return false;
    }

    const shouldStartPan =
      event.button === 1 ||
      (event.button === 0 && (spacePanArmed || options?.allowPrimaryButton));

    if (!shouldStartPan) {
      return false;
    }

    if (activePanPointerIdRef.current !== null) {
      return false;
    }

    ensureCurrentFreeformPersistenceContext();
    event.preventDefault();
    event.stopPropagation();

    const initialPanState: PanState = {
      startClientXPx: event.clientX,
      startClientYPx: event.clientY,
      startPanXPx: freeformViewState.panXPx,
      startPanYPx: freeformViewState.panYPx,
      pointerId:
        event.type === "pointerdown"
          ? resolvePointerIdentifier(resolveReactNativeEvent(event) ?? event)
          : null,
      requiredButtonsMask: event.button === 1 ? 4 : 1,
      moveEventName: event.type === "pointerdown" ? "pointermove" : "mousemove",
      upEventName: event.type === "pointerdown" ? "pointerup" : "mouseup",
    };
    const cancelEventName = event.type === "pointerdown" ? "pointercancel" : null;
    activePanPointerIdRef.current = initialPanState.pointerId ?? "mouse";

    function endViewportPan() {
      if (activePanPointerIdRef.current === (initialPanState.pointerId ?? "mouse")) {
        activePanPointerIdRef.current = null;
      }
      setIsPanning(false);
      window.removeEventListener(initialPanState.moveEventName, handlePointerMove);
      window.removeEventListener(initialPanState.upEventName, handlePointerUp);
      if (cancelEventName) {
        window.removeEventListener(cancelEventName, handlePointerUp);
      }
      window.removeEventListener("blur", endViewportPan);
    }

    function handlePointerMove(nextEvent: MouseEvent | PointerEvent) {
      if (
        initialPanState.pointerId !== null &&
        resolvePointerIdentifier(nextEvent) !== initialPanState.pointerId
      ) {
        return;
      }

      if (
        typeof nextEvent.buttons === "number" &&
        (nextEvent.buttons & initialPanState.requiredButtonsMask) === 0
      ) {
        endViewportPan();
        return;
      }

      setFreeformViewState((current) => ({
        ...current,
        panXPx:
          initialPanState.startPanXPx + (nextEvent.clientX - initialPanState.startClientXPx),
        panYPx:
          initialPanState.startPanYPx + (nextEvent.clientY - initialPanState.startClientYPx),
      }));
    }

    function handlePointerUp(nextEvent?: MouseEvent | PointerEvent) {
      if (
        initialPanState.pointerId !== null &&
        nextEvent &&
        resolvePointerIdentifier(nextEvent) !== initialPanState.pointerId
      ) {
        return;
      }

      endViewportPan();
    }

    setIsPanning(true);
    window.addEventListener(initialPanState.moveEventName, handlePointerMove);
    window.addEventListener(initialPanState.upEventName, handlePointerUp);
    if (cancelEventName) {
      window.addEventListener(cancelEventName, handlePointerUp);
    }
    window.addEventListener("blur", endViewportPan);
    return true;
  }

  function beginCardDrag(card: ReadingCanvasCard, event: DragStartEvent) {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    onSelectCard(card.id);

    const pointer = resolveViewportPoint({
      event,
      viewportElement: viewportRef.current,
      mode: activeMode,
      freeformViewState,
    });

    if (!pointer) {
      return;
    }

    const currentPosition = resolveCardPosition(card, activeMode, gridMetrics);
    const moveEventName = event.type === "mousedown" ? "mousemove" : "pointermove";
    const upEventName = event.type === "mousedown" ? "mouseup" : "pointerup";
    const cancelEventName = event.type === "pointerdown" ? "pointercancel" : null;

    const initialDragState: DragState = {
      cardId: card.id,
      mode: activeMode,
      moveEventName,
      upEventName,
      pointerId:
        event.type === "pointerdown"
          ? resolvePointerIdentifier(resolveReactNativeEvent(event) ?? event)
          : null,
      pointerOffsetXPx: pointer.xPx - currentPosition.xPx,
      pointerOffsetYPx: pointer.yPx - currentPosition.yPx,
      freeformViewState:
        activeMode === "freeform"
          ? {
              ...freeformViewState,
            }
          : null,
      gridMetrics:
        activeMode === "grid"
          ? {
              ...gridMetrics,
            }
          : null,
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
      if (
        initialDragState.pointerId !== null &&
        resolvePointerIdentifier(nextEvent) !== initialDragState.pointerId
      ) {
        return;
      }

      const nextPoint = resolveViewportPoint({
        event: nextEvent,
        viewportElement: viewportRef.current,
        mode: initialDragState.mode,
        freeformViewState:
          initialDragState.freeformViewState ?? getDefaultFreeformViewState(),
      });

      if (!nextPoint) {
        return;
      }

      if (initialDragState.mode === "freeform") {
        currentFreeform = clampFreeformPosition(
          {
            xPx: nextPoint.xPx - initialDragState.pointerOffsetXPx,
            yPx: nextPoint.yPx - initialDragState.pointerOffsetYPx,
          },
          undefined
        );

        setDragState({
          ...initialDragState,
          freeform: currentFreeform,
          grid: currentGrid,
        });
        return;
      }

      const { cellWidthPx, cellHeightPx } = getGridCellSize(
        initialDragState.gridMetrics ?? gridMetrics
      );
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
        initialDragState.gridMetrics ?? gridMetrics
      );

      setDragState({
        ...initialDragState,
        freeform: currentFreeform,
        grid: currentGrid,
      });
    }

    function endCardDrag(commitMove: boolean) {
      if (commitMove && initialDragState.mode === "freeform" && currentFreeform) {
        onMoveCard(initialDragState.cardId, {
          freeform: currentFreeform,
        });
      }

      if (commitMove && initialDragState.mode === "grid" && currentGrid) {
        onMoveCard(initialDragState.cardId, {
          grid: currentGrid,
        });
      }

      setDragState(null);
      window.removeEventListener(moveEventName, handlePointerMove);
      window.removeEventListener(upEventName, handlePointerUp);
      if (cancelEventName) {
        window.removeEventListener(cancelEventName, handlePointerCancel);
      }
    }

    function handlePointerUp(nextEvent?: DragMoveEvent) {
      if (
        initialDragState.pointerId !== null &&
        nextEvent &&
        resolvePointerIdentifier(nextEvent) !== initialDragState.pointerId
      ) {
        return;
      }

      endCardDrag(true);
    }

    function handlePointerCancel(nextEvent?: DragMoveEvent) {
      if (
        initialDragState.pointerId !== null &&
        nextEvent &&
        resolvePointerIdentifier(nextEvent) !== initialDragState.pointerId
      ) {
        return;
      }

      endCardDrag(false);
    }

    setDragState(initialDragState);
    window.addEventListener(moveEventName, handlePointerMove);
    window.addEventListener(upEventName, handlePointerUp);
    if (cancelEventName) {
      window.addEventListener(cancelEventName, handlePointerCancel);
    }
  }

  function resolveCardStyle(card: ReadingCanvasCard) {
    const position = resolveCardPosition(card, activeMode, gridMetrics);

    return {
      left: `${position.xPx}px`,
      top: `${position.yPx}px`,
      zIndex:
        activeMode === "freeform"
          ? dragState?.cardId === card.id
            ? 999
            : card.freeform.stackOrder
          : card.grid.row * 10 + card.grid.column + 1,
      transform: `rotate(${card.rotationDeg}deg)`,
    };
  }

  const viewControlsDisabled = !isFreeformMode;
  const freeformWorldTransform = `translate3d(${freeformViewState.panXPx}px, ${freeformViewState.panYPx}px, 0) scale(${freeformViewState.zoomLevel})`;

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
              onClick={() =>
                scheduleZoom(freeformViewState.zoomLevel - CANVAS_ZOOM_STEP)
              }
              disabled={viewControlsDisabled}
            >
              -
            </button>
            <span className="reading-canvas-zoom-readout" aria-live="polite">
              {Math.round(freeformViewState.zoomLevel * 100)}%
            </span>
            <button
              type="button"
              className="reading-canvas-toolbar-button"
              aria-label="Zoom in"
              onClick={() =>
                scheduleZoom(freeformViewState.zoomLevel + CANVAS_ZOOM_STEP)
              }
              disabled={viewControlsDisabled}
            >
              +
            </button>
            <button
              type="button"
              className="reading-canvas-toolbar-button"
              onClick={handleFitSpread}
              disabled={viewControlsDisabled}
            >
              Fit Spread
            </button>
            <button
              type="button"
              className="reading-canvas-toolbar-button"
              onClick={handleResetView}
              disabled={viewControlsDisabled}
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
            {isFreeformMode
              ? "Drag the background to pan. Wheel pans. Ctrl/Cmd + wheel zooms."
              : "Grid stays bounded. Switch to freeform for infinite pan and zoom."}
          </p>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="reading-canvas-surface"
        aria-label="Reading canvas viewport"
        data-mode={activeMode}
        data-pan-ready={isFreeformMode && spacePanArmed ? "true" : "false"}
        data-panning={isPanning ? "true" : "false"}
        data-view-pan-x={Math.round(freeformViewState.panXPx)}
        data-view-pan-y={Math.round(freeformViewState.panYPx)}
        data-view-zoom={freeformViewState.zoomLevel.toFixed(3)}
        style={{
          touchAction: isFreeformMode ? "none" : "auto",
        }}
        onMouseDownCapture={(event) => beginViewportPan(event)}
        onPointerDown={(event) => {
          if (isFreeformMode && !isCardElement(event.target)) {
            if (beginViewportPan(event, { allowPrimaryButton: true })) {
              onSelectCard(null);
            }
          }
        }}
        onMouseDown={(event) => {
          if (
            isFreeformMode &&
            !supportsPointerEvents &&
            !isCardElement(event.target)
          ) {
            if (beginViewportPan(event, { allowPrimaryButton: true })) {
              onSelectCard(null);
            }
          }
        }}
        onAuxClick={(event) => {
          if (event.button === 1) {
            event.preventDefault();
          }
        }}
      >
        {isFreeformMode ? <div className="reading-canvas-backdrop" aria-hidden="true" /> : null}

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

        {isFreeformMode ? (
          <div
            className="reading-canvas-world"
            data-mode="freeform"
            style={{
              transform: freeformWorldTransform,
            }}
          >
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
        ) : (
          <div
            className="reading-canvas-stage"
            style={{
              width: `${gridMetrics.widthPx}px`,
              height: `${gridMetrics.heightPx}px`,
            }}
          >
            <div
              className="reading-canvas-world"
              data-mode="grid"
              style={{
                width: `${gridMetrics.widthPx}px`,
                height: `${gridMetrics.heightPx}px`,
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
        )}
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
