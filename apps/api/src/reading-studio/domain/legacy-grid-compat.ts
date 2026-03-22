import type {
  CreateReadingResponse,
  ReadingCanvasCardState,
  ReadingDetail,
} from "@tarology/shared";

const LEGACY_GRID_X_STEP_PX = 230.5;
const LEGACY_GRID_Y_STEP_PX = 200.6666666667;
const LEGACY_GRID_PADDING_PX = 28;

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
  return {
    xPx: Math.round(LEGACY_GRID_PADDING_PX + position.column * LEGACY_GRID_X_STEP_PX),
    yPx: Math.round(LEGACY_GRID_PADDING_PX + position.row * LEGACY_GRID_Y_STEP_PX),
    stackOrder: position.row * 10 + position.column + 1,
  };
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

  return {
    readingId: value.readingId,
    rootQuestion: value.rootQuestion,
    deckId: value.deckId,
    deckSpecVersion: value.deckSpecVersion,
    cardCount: value.cardCount,
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
      cards: value.canvas.cards.map((card) => {
        const record = card as unknown as Record<string, unknown>;
        const freeform = resolveCompatibleFreeformPosition(
          record,
          preferLegacyGrid,
          card.deckIndex + 1
        );

        const normalizedCard: ReadingCanvasCardState = {
          deckIndex: card.deckIndex,
          cardId: card.cardId,
          assignedReversal: card.assignedReversal,
          isFaceUp: card.isFaceUp,
          rotationDeg: card.rotationDeg,
          freeform,
        };

        return normalizedCard;
      }),
    },
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    archivedAt: value.archivedAt,
    deletedAt: value.deletedAt,
  } as T;
}
