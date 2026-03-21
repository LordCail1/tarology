import type {
  CanvasMode,
  FreeformPosition,
  GridPosition,
  ReadingCanvasCard,
} from "./reading-studio-types";

export const CANVAS_DEFAULT_WIDTH_PX = 960;
export const CANVAS_DEFAULT_HEIGHT_PX = 640;
export const CARD_WIDTH_PX = 124;
export const CARD_HEIGHT_PX = 196;
export const GRID_COLUMNS = 4;
export const GRID_ROWS = 3;
export const GRID_GAP_PX = 18;
export const GRID_PADDING_PX = 28;
export const FREEFORM_WORLD_PADDING_PX = 96;
export const MIN_CANVAS_ZOOM = 0.5;
export const MAX_CANVAS_ZOOM = 1.8;
export const DEFAULT_CANVAS_ZOOM = 1;
export const CANVAS_ZOOM_STEP = 0.1;
export const VIEWPORT_REVEAL_PADDING_PX = 24;

export interface CanvasMetrics {
  widthPx: number;
  heightPx: number;
}

export interface CanvasViewRect {
  leftPx: number;
  topPx: number;
  widthPx: number;
  heightPx: number;
}

export interface CanvasScrollPosition {
  leftPx: number;
  topPx: number;
}

function coerceFiniteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function resolveCanvasMetrics(
  partial: Partial<CanvasMetrics> | undefined
): CanvasMetrics {
  return {
    widthPx:
      partial?.widthPx && partial.widthPx > 0 ? partial.widthPx : CANVAS_DEFAULT_WIDTH_PX,
    heightPx:
      partial?.heightPx && partial.heightPx > 0 ? partial.heightPx : CANVAS_DEFAULT_HEIGHT_PX,
  };
}

export function clampCanvasZoom(proposedZoom: number): number {
  const normalizedZoom = coerceFiniteNumber(proposedZoom, DEFAULT_CANVAS_ZOOM);
  return Math.max(MIN_CANVAS_ZOOM, Math.min(normalizedZoom, MAX_CANVAS_ZOOM));
}

export function clampFreeformPosition(
  proposed: Pick<FreeformPosition, "xPx" | "yPx">,
  metrics: Partial<CanvasMetrics> | undefined
): Pick<FreeformPosition, "xPx" | "yPx"> {
  void metrics;
  const proposedXPx = coerceFiniteNumber(proposed.xPx, 0);
  const proposedYPx = coerceFiniteNumber(proposed.yPx, 0);

  return {
    xPx: Math.max(0, proposedXPx),
    yPx: Math.max(0, proposedYPx),
  };
}

export function resolveCanvasContentMetrics(
  mode: CanvasMode,
  cards: Pick<ReadingCanvasCard, "freeform">[]
): CanvasMetrics {
  if (mode === "grid") {
    return resolveCanvasMetrics(undefined);
  }

  const maxRightPx = cards.reduce(
    (currentMax, card) =>
      Math.max(currentMax, card.freeform.xPx + CARD_WIDTH_PX + FREEFORM_WORLD_PADDING_PX),
    CANVAS_DEFAULT_WIDTH_PX
  );
  const maxBottomPx = cards.reduce(
    (currentMax, card) =>
      Math.max(currentMax, card.freeform.yPx + CARD_HEIGHT_PX + FREEFORM_WORLD_PADDING_PX),
    CANVAS_DEFAULT_HEIGHT_PX
  );

  return resolveCanvasMetrics({
    widthPx: maxRightPx,
    heightPx: maxBottomPx,
  });
}

export function resolveCanvasWorldMetrics(options: {
  mode: CanvasMode;
  cards: Pick<ReadingCanvasCard, "freeform">[];
  viewportMetrics: Partial<CanvasMetrics> | undefined;
  zoomLevel?: number;
}): CanvasMetrics {
  const contentMetrics = resolveCanvasContentMetrics(options.mode, options.cards);
  const viewportMetrics = resolveCanvasMetrics(options.viewportMetrics);
  const zoomLevel = clampCanvasZoom(options.zoomLevel ?? DEFAULT_CANVAS_ZOOM);

  return {
    widthPx: Math.max(contentMetrics.widthPx, viewportMetrics.widthPx / zoomLevel),
    heightPx: Math.max(contentMetrics.heightPx, viewportMetrics.heightPx / zoomLevel),
  };
}

export function resolveScaledCanvasMetrics(
  metrics: Partial<CanvasMetrics> | undefined,
  zoomLevel: number
): CanvasMetrics {
  const resolvedMetrics = resolveCanvasMetrics(metrics);
  const resolvedZoom = clampCanvasZoom(zoomLevel);

  return {
    widthPx: resolvedMetrics.widthPx * resolvedZoom,
    heightPx: resolvedMetrics.heightPx * resolvedZoom,
  };
}

export function resolveFitCanvasZoom(
  contentMetrics: Partial<CanvasMetrics> | undefined,
  viewportMetrics: Partial<CanvasMetrics> | undefined
): number {
  const resolvedContent = resolveCanvasMetrics(contentMetrics);
  const resolvedViewport = resolveCanvasMetrics(viewportMetrics);

  return clampCanvasZoom(
    Math.min(
      DEFAULT_CANVAS_ZOOM,
      resolvedViewport.widthPx / resolvedContent.widthPx,
      resolvedViewport.heightPx / resolvedContent.heightPx
    )
  );
}

export function resolveViewportRevealScroll(options: {
  viewportMetrics: Partial<CanvasMetrics> | undefined;
  scrollPosition: CanvasScrollPosition;
  targetRect: CanvasViewRect;
  zoomLevel: number;
  paddingPx?: number;
}): CanvasScrollPosition | null {
  const viewportMetrics = resolveCanvasMetrics(options.viewportMetrics);
  const zoomLevel = clampCanvasZoom(options.zoomLevel);
  const paddingPx = Math.max(0, options.paddingPx ?? VIEWPORT_REVEAL_PADDING_PX);
  const scaledLeftPx = options.targetRect.leftPx * zoomLevel;
  const scaledTopPx = options.targetRect.topPx * zoomLevel;
  const scaledRightPx = scaledLeftPx + options.targetRect.widthPx * zoomLevel;
  const scaledBottomPx = scaledTopPx + options.targetRect.heightPx * zoomLevel;

  let nextLeftPx = options.scrollPosition.leftPx;
  let nextTopPx = options.scrollPosition.topPx;

  if (scaledLeftPx < nextLeftPx + paddingPx) {
    nextLeftPx = Math.max(0, scaledLeftPx - paddingPx);
  } else if (scaledRightPx > nextLeftPx + viewportMetrics.widthPx - paddingPx) {
    nextLeftPx = Math.max(
      0,
      scaledRightPx - viewportMetrics.widthPx + paddingPx
    );
  }

  if (scaledTopPx < nextTopPx + paddingPx) {
    nextTopPx = Math.max(0, scaledTopPx - paddingPx);
  } else if (scaledBottomPx > nextTopPx + viewportMetrics.heightPx - paddingPx) {
    nextTopPx = Math.max(
      0,
      scaledBottomPx - viewportMetrics.heightPx + paddingPx
    );
  }

  if (
    nextLeftPx === options.scrollPosition.leftPx &&
    nextTopPx === options.scrollPosition.topPx
  ) {
    return null;
  }

  return {
    leftPx: nextLeftPx,
    topPx: nextTopPx,
  };
}

export function getGridCellSize(metrics: Partial<CanvasMetrics> | undefined): {
  cellWidthPx: number;
  cellHeightPx: number;
} {
  const resolved = resolveCanvasMetrics(metrics);
  const totalGapWidth = GRID_GAP_PX * (GRID_COLUMNS - 1);
  const totalGapHeight = GRID_GAP_PX * (GRID_ROWS - 1);
  const innerWidth = resolved.widthPx - GRID_PADDING_PX * 2;
  const innerHeight = resolved.heightPx - GRID_PADDING_PX * 2;

  return {
    cellWidthPx: (innerWidth - totalGapWidth) / GRID_COLUMNS,
    cellHeightPx: (innerHeight - totalGapHeight) / GRID_ROWS,
  };
}

export function snapGridPosition(
  proposed: GridPosition,
  metrics: Partial<CanvasMetrics> | undefined
): GridPosition {
  void metrics;
  const proposedColumn = coerceFiniteNumber(proposed.column, 0);
  const proposedRow = coerceFiniteNumber(proposed.row, 0);

  return {
    column: Math.max(0, Math.min(proposedColumn, GRID_COLUMNS - 1)),
    row: Math.max(0, Math.min(proposedRow, GRID_ROWS - 1)),
  };
}

export function resolveGridPixelPosition(
  position: GridPosition,
  metrics: Partial<CanvasMetrics> | undefined
): { xPx: number; yPx: number } {
  const snapped = snapGridPosition(position, metrics);
  const { cellWidthPx, cellHeightPx } = getGridCellSize(metrics);

  return {
    xPx: GRID_PADDING_PX + snapped.column * (cellWidthPx + GRID_GAP_PX),
    yPx: GRID_PADDING_PX + snapped.row * (cellHeightPx + GRID_GAP_PX),
  };
}

export function getHighestStackOrder(cards: ReadingCanvasCard[]): number {
  return cards.reduce(
    (highest, card) => Math.max(highest, card.freeform.stackOrder),
    0
  );
}
