import type { ReadingCanvasCardState, ReadingCardAssignment } from "@tarology/shared";

const INITIAL_FREEFORM_COLUMNS = 10;
const INITIAL_FREEFORM_STEP_X_PX = 24;
const INITIAL_FREEFORM_STEP_Y_PX = 18;
const INITIAL_FREEFORM_START_X_PX = 40;
const INITIAL_FREEFORM_START_Y_PX = 56;
const INITIAL_GRID_COLUMNS = 10;

export function normalizeRotation(nextRotationDeg: number): number {
  const normalized = nextRotationDeg % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function buildInitialCanvasCards(
  assignments: ReadingCardAssignment[]
): ReadingCanvasCardState[] {
  return assignments.map((assignment) => {
    const freeformColumn = assignment.deckIndex % INITIAL_FREEFORM_COLUMNS;
    const freeformRow = Math.floor(assignment.deckIndex / INITIAL_FREEFORM_COLUMNS);

    return {
      ...assignment,
      isFaceUp: false,
      rotationDeg: 0,
      freeform: {
        xPx: INITIAL_FREEFORM_START_X_PX + freeformColumn * INITIAL_FREEFORM_STEP_X_PX,
        yPx: INITIAL_FREEFORM_START_Y_PX + freeformRow * INITIAL_FREEFORM_STEP_Y_PX,
        stackOrder: assignment.deckIndex + 1,
      },
      grid: {
        column: assignment.deckIndex % INITIAL_GRID_COLUMNS,
        row: Math.floor(assignment.deckIndex / INITIAL_GRID_COLUMNS),
      },
    };
  });
}

export function getHighestStackOrder(cards: ReadingCanvasCardState[]): number {
  return cards.reduce((highest, card) => Math.max(highest, card.freeform.stackOrder), 0);
}
