import type {
  CreateReadingResponse,
  ReadingDetail,
  ReadingSummary,
} from "@tarology/shared";

const LEGACY_GRID_X_STEP_PX = 230.5;
const LEGACY_GRID_Y_STEP_PX = 200.6666666667;
const LEGACY_GRID_PADDING_PX = 28;
const LEGACY_GRID_MAX_COLUMN = 3;
const LEGACY_GRID_MAX_ROW = 2;

interface LegacyGridPosition {
  column: number;
  row: number;
}

interface LegacyFreeformPosition {
  xPx: number;
  yPx: number;
  stackOrder: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isLegacyGridPosition(value: unknown): value is LegacyGridPosition {
  return (
    isRecord(value) &&
    isFiniteNumber(value.column) &&
    isFiniteNumber(value.row)
  );
}

function clampLegacyGridPosition(position: LegacyGridPosition): LegacyGridPosition {
  return {
    column: Math.max(0, Math.min(position.column, LEGACY_GRID_MAX_COLUMN)),
    row: Math.max(0, Math.min(position.row, LEGACY_GRID_MAX_ROW)),
  };
}

function isLegacyFreeformPosition(value: unknown): value is LegacyFreeformPosition {
  return (
    isRecord(value) &&
    isFiniteNumber(value.xPx) &&
    isFiniteNumber(value.yPx) &&
    isFiniteNumber(value.stackOrder)
  );
}

function usesLegacyGridLayout(
  value: ReadingDetail | CreateReadingResponse
): boolean {
  if (isRecord(value.canvas) && value.canvas.activeMode === "grid") {
    return true;
  }

  return isRecord(value) && value.canvasMode === "grid";
}

export function resolveLegacyGridFreeformPosition(
  position: LegacyGridPosition
): LegacyFreeformPosition {
  const snapped = clampLegacyGridPosition(position);

  return {
    xPx: Math.round(LEGACY_GRID_PADDING_PX + snapped.column * LEGACY_GRID_X_STEP_PX),
    yPx: Math.round(LEGACY_GRID_PADDING_PX + snapped.row * LEGACY_GRID_Y_STEP_PX),
    stackOrder: snapped.row * 10 + snapped.column + 1,
  };
}

function resolveLegacyGridPositionFromFreeform(
  position: LegacyFreeformPosition
): LegacyGridPosition {
  return clampLegacyGridPosition({
    column: Math.round((position.xPx - LEGACY_GRID_PADDING_PX) / LEGACY_GRID_X_STEP_PX),
    row: Math.round((position.yPx - LEGACY_GRID_PADDING_PX) / LEGACY_GRID_Y_STEP_PX),
  });
}

function resolveCompatibleFreeformPosition(
  card: Record<string, unknown>,
  preferLegacyGrid: boolean,
  fallbackStackOrder: number
): LegacyFreeformPosition {
  const grid = card.grid;
  const freeform = card.freeform;

  if (preferLegacyGrid && isLegacyGridPosition(grid)) {
    return resolveLegacyGridFreeformPosition(grid);
  }

  if (isLegacyFreeformPosition(freeform)) {
    return freeform;
  }

  if (isLegacyGridPosition(grid)) {
    return resolveLegacyGridFreeformPosition(grid);
  }

  return {
    xPx: 0,
    yPx: 0,
    stackOrder: fallbackStackOrder,
  };
}

export function normalizeLegacyReadingDetail<
  T extends ReadingDetail | CreateReadingResponse,
>(value: T): T {
  const preferLegacyGrid = usesLegacyGridLayout(value);
  const canvasCards = value.canvas.cards.map((card) => {
    const record = card as unknown as Record<string, unknown>;
    const freeform = resolveCompatibleFreeformPosition(
      record,
      preferLegacyGrid,
      card.deckIndex + 1
    );
    const grid = isLegacyGridPosition(record.grid)
      ? clampLegacyGridPosition(record.grid)
      : resolveLegacyGridPositionFromFreeform(freeform);

    return {
      deckIndex: card.deckIndex,
      cardId: card.cardId,
      assignedReversal: card.assignedReversal,
      isFaceUp: card.isFaceUp,
      rotationDeg: card.rotationDeg,
      freeform,
      grid,
    };
  });

  return {
    readingId: value.readingId,
    rootQuestion: value.rootQuestion,
    deckId: value.deckId,
    deckSpecVersion: value.deckSpecVersion,
    cardCount: value.cardCount,
    canvasMode: preferLegacyGrid ? "grid" : "freeform",
    status: value.status,
    version: value.version,
    shuffleAlgorithmVersion: value.shuffleAlgorithmVersion,
    seedCommitment: value.seedCommitment,
    orderHash: value.orderHash,
    assignments: value.assignments.map((assignment) => ({
      deckIndex: assignment.deckIndex,
      cardId: assignment.cardId,
      assignedReversal: assignment.assignedReversal,
    })),
    canvas: {
      activeMode: preferLegacyGrid ? "grid" : "freeform",
      cards: canvasCards,
    },
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    archivedAt: value.archivedAt,
    deletedAt: value.deletedAt,
  } as unknown as T;
}

export function withLegacyReadingSummaryFields<T extends ReadingSummary>(
  value: T
): T {
  return {
    ...value,
    canvasMode: "freeform",
  } as T;
}
