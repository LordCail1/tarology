import type { FreeformPosition, ReadingCanvasCard } from "./reading-studio-types";

export const CANVAS_DEFAULT_WIDTH_PX = 960;
export const CANVAS_DEFAULT_HEIGHT_PX = 640;
export const CARD_WIDTH_PX = 124;
export const CARD_HEIGHT_PX = 196;
export const FREEFORM_WORLD_PADDING_PX = 96;
export const MIN_CANVAS_ZOOM = 0.0001;
export const MIN_INTERACTIVE_CANVAS_ZOOM = 0.05;
export const MAX_CANVAS_ZOOM = 1.8;
export const DEFAULT_CANVAS_ZOOM = 1;
export const CANVAS_ZOOM_STEP = 0.1;

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

export interface FreeformViewState {
  panXPx: number;
  panYPx: number;
  zoomLevel: number;
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

export function clampCanvasZoom(
  proposedZoom: number,
  minimumZoom: number = MIN_CANVAS_ZOOM
): number {
  const normalizedZoom = coerceFiniteNumber(proposedZoom, DEFAULT_CANVAS_ZOOM);
  const normalizedMinimumZoom = Math.max(
    MIN_CANVAS_ZOOM,
    coerceFiniteNumber(minimumZoom, MIN_CANVAS_ZOOM)
  );
  return Math.max(normalizedMinimumZoom, Math.min(normalizedZoom, MAX_CANVAS_ZOOM));
}

export function clampInteractiveCanvasZoom(options: {
  currentZoom: number;
  proposedZoom: number;
}): number {
  const currentZoom = clampCanvasZoom(options.currentZoom);
  const proposedZoom = clampCanvasZoom(options.proposedZoom);

  if (
    currentZoom < MIN_INTERACTIVE_CANVAS_ZOOM &&
    proposedZoom < MIN_INTERACTIVE_CANVAS_ZOOM
  ) {
    return Math.max(currentZoom, proposedZoom);
  }

  return clampCanvasZoom(proposedZoom, MIN_INTERACTIVE_CANVAS_ZOOM);
}

export function getDefaultFreeformViewState(): FreeformViewState {
  return {
    panXPx: 0,
    panYPx: 0,
    zoomLevel: DEFAULT_CANVAS_ZOOM,
  };
}

export function clampFreeformPosition(
  proposed: Pick<FreeformPosition, "xPx" | "yPx">,
  metrics: Partial<CanvasMetrics> | undefined
): Pick<FreeformPosition, "xPx" | "yPx"> {
  void metrics;
  const proposedXPx = coerceFiniteNumber(proposed.xPx, 0);
  const proposedYPx = coerceFiniteNumber(proposed.yPx, 0);

  return {
    xPx: proposedXPx,
    yPx: proposedYPx,
  };
}

export function resolveFreeformViewportPoint(options: {
  clientXPx: number;
  clientYPx: number;
  viewportRect:
    | Pick<DOMRect, "left" | "top">
    | {
        left: number;
        top: number;
      };
  viewState: FreeformViewState;
}): { xPx: number; yPx: number } {
  const zoomLevel = clampCanvasZoom(options.viewState.zoomLevel);

  return {
    xPx: (options.clientXPx - options.viewportRect.left - options.viewState.panXPx) / zoomLevel,
    yPx: (options.clientYPx - options.viewportRect.top - options.viewState.panYPx) / zoomLevel,
  };
}

export function resolveFreeformContentBounds(
  cards: Pick<ReadingCanvasCard, "freeform">[],
  paddingPx: number = FREEFORM_WORLD_PADDING_PX
): CanvasViewRect | null {
  if (cards.length === 0) {
    return null;
  }

  const minLeftPx = cards.reduce(
    (currentMin, card) => Math.min(currentMin, card.freeform.xPx),
    Number.POSITIVE_INFINITY
  );
  const minTopPx = cards.reduce(
    (currentMin, card) => Math.min(currentMin, card.freeform.yPx),
    Number.POSITIVE_INFINITY
  );
  const maxRightPx = cards.reduce(
    (currentMax, card) => Math.max(currentMax, card.freeform.xPx + CARD_WIDTH_PX),
    Number.NEGATIVE_INFINITY
  );
  const maxBottomPx = cards.reduce(
    (currentMax, card) => Math.max(currentMax, card.freeform.yPx + CARD_HEIGHT_PX),
    Number.NEGATIVE_INFINITY
  );

  return {
    leftPx: minLeftPx - paddingPx,
    topPx: minTopPx - paddingPx,
    widthPx: maxRightPx - minLeftPx + paddingPx * 2,
    heightPx: maxBottomPx - minTopPx + paddingPx * 2,
  };
}

export function resolveFreeformFitViewState(options: {
  bounds: CanvasViewRect | null;
  viewportMetrics: Partial<CanvasMetrics> | undefined;
}): FreeformViewState {
  const viewportMetrics = resolveCanvasMetrics(options.viewportMetrics);
  const defaultViewState = getDefaultFreeformViewState();

  if (!options.bounds || options.bounds.widthPx <= 0 || options.bounds.heightPx <= 0) {
    return defaultViewState;
  }

  const zoomLevel = clampCanvasZoom(
    Math.min(
      DEFAULT_CANVAS_ZOOM,
      viewportMetrics.widthPx / options.bounds.widthPx,
      viewportMetrics.heightPx / options.bounds.heightPx
    )
  );

  return {
    panXPx:
      (viewportMetrics.widthPx - options.bounds.widthPx * zoomLevel) / 2 -
      options.bounds.leftPx * zoomLevel,
    panYPx:
      (viewportMetrics.heightPx - options.bounds.heightPx * zoomLevel) / 2 -
      options.bounds.topPx * zoomLevel,
    zoomLevel,
  };
}

export function resolveZoomedFreeformViewState(options: {
  current: FreeformViewState;
  nextZoomLevel: number;
  anchorPointPx: { xPx: number; yPx: number };
}): FreeformViewState {
  const currentZoomLevel = clampCanvasZoom(options.current.zoomLevel);
  const nextZoomLevel = clampCanvasZoom(options.nextZoomLevel);

  if (currentZoomLevel === nextZoomLevel) {
    return {
      ...options.current,
      zoomLevel: nextZoomLevel,
    };
  }

  const anchorWorldPoint = {
    xPx: (options.anchorPointPx.xPx - options.current.panXPx) / currentZoomLevel,
    yPx: (options.anchorPointPx.yPx - options.current.panYPx) / currentZoomLevel,
  };

  return {
    panXPx: options.anchorPointPx.xPx - anchorWorldPoint.xPx * nextZoomLevel,
    panYPx: options.anchorPointPx.yPx - anchorWorldPoint.yPx * nextZoomLevel,
    zoomLevel: nextZoomLevel,
  };
}

export function resolveViewportCenteredFreeformViewState(options: {
  previousViewportMetrics: Partial<CanvasMetrics> | undefined;
  nextViewportMetrics: Partial<CanvasMetrics> | undefined;
  viewState: FreeformViewState;
}): FreeformViewState {
  const previousViewportMetrics = resolveCanvasMetrics(options.previousViewportMetrics);
  const nextViewportMetrics = resolveCanvasMetrics(options.nextViewportMetrics);
  const zoomLevel = clampCanvasZoom(options.viewState.zoomLevel);
  const centerWorldPoint = {
    xPx: (previousViewportMetrics.widthPx / 2 - options.viewState.panXPx) / zoomLevel,
    yPx: (previousViewportMetrics.heightPx / 2 - options.viewState.panYPx) / zoomLevel,
  };

  return {
    panXPx: nextViewportMetrics.widthPx / 2 - centerWorldPoint.xPx * zoomLevel,
    panYPx: nextViewportMetrics.heightPx / 2 - centerWorldPoint.yPx * zoomLevel,
    zoomLevel,
  };
}

export function resolveCanvasContentMetrics(
  cards: Pick<ReadingCanvasCard, "freeform">[]
): CanvasMetrics {
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
  cards: Pick<ReadingCanvasCard, "freeform">[];
  viewportMetrics: Partial<CanvasMetrics> | undefined;
  zoomLevel?: number;
}): CanvasMetrics {
  const contentMetrics = resolveCanvasContentMetrics(options.cards);
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

export function getHighestStackOrder(cards: ReadingCanvasCard[]): number {
  return cards.reduce(
    (highest, card) => Math.max(highest, card.freeform.stackOrder),
    0
  );
}
