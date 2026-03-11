import type {
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

export interface CanvasMetrics {
  widthPx: number;
  heightPx: number;
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

export function clampFreeformPosition(
  proposed: Pick<FreeformPosition, "xPx" | "yPx">,
  metrics: Partial<CanvasMetrics> | undefined
): Pick<FreeformPosition, "xPx" | "yPx"> {
  const resolved = resolveCanvasMetrics(metrics);
  const proposedXPx = coerceFiniteNumber(proposed.xPx, 0);
  const proposedYPx = coerceFiniteNumber(proposed.yPx, 0);

  return {
    xPx: Math.max(0, Math.min(proposedXPx, resolved.widthPx - CARD_WIDTH_PX)),
    yPx: Math.max(0, Math.min(proposedYPx, resolved.heightPx - CARD_HEIGHT_PX)),
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
