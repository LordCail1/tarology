import {
  clampPanelWidth,
  getViewportWidth,
} from "./reading-studio-layout";
import { getHighestStackOrder } from "./reading-studio-canvas";
import type {
  ReadingStudioAction,
  ReadingStudioLayoutPreferences,
  ReadingStudioWorkspace,
} from "./reading-studio-types";

function normalizeRotation(nextRotationDeg: number): number {
  const normalized = nextRotationDeg % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function applyLayoutAction(
  current: ReadingStudioLayoutPreferences,
  action: Extract<
    ReadingStudioAction,
    { type: "layout.panelResized" | "layout.panelToggled" }
  >,
  viewportWidth: number = getViewportWidth()
): ReadingStudioLayoutPreferences {
  switch (action.type) {
    case "layout.panelToggled":
      return action.side === "left"
        ? { ...current, leftOpen: !current.leftOpen }
        : { ...current, rightOpen: !current.rightOpen };
    case "layout.panelResized":
      return action.side === "left"
        ? {
            ...current,
            leftWidthPx: clampPanelWidth(current, "left", action.widthPx, viewportWidth),
          }
        : {
            ...current,
            rightWidthPx: clampPanelWidth(current, "right", action.widthPx, viewportWidth),
          };
  }
}

export function applyWorkspaceAction(
  current: ReadingStudioWorkspace,
  action: Extract<
    ReadingStudioAction,
    {
      type:
        | "workspace.modeSwitched"
        | "workspace.cardMoved"
        | "workspace.cardRotated"
        | "workspace.cardFlipped";
    }
  >
): ReadingStudioWorkspace {
  switch (action.type) {
    case "workspace.modeSwitched":
      return {
        ...current,
        canvas: {
          ...current.canvas,
          activeMode: action.mode,
        },
      };
    case "workspace.cardMoved":
      return {
        ...current,
        canvas: {
          ...current.canvas,
          cards: current.canvas.cards.map((card) => {
            if (card.id !== action.cardId) {
              return card;
            }

            return {
              ...card,
              freeform: action.freeform
                ? {
                    ...card.freeform,
                    xPx: action.freeform.xPx,
                    yPx: action.freeform.yPx,
                    stackOrder: getHighestStackOrder(current.canvas.cards) + 1,
                  }
                : card.freeform,
              grid: action.grid
                ? {
                    column: action.grid.column,
                    row: action.grid.row,
                  }
                : card.grid,
            };
          }),
        },
      };
    case "workspace.cardRotated":
      return {
        ...current,
        canvas: {
          ...current.canvas,
          cards: current.canvas.cards.map((card) =>
            card.id === action.cardId
              ? {
                  ...card,
                  rotationDeg: normalizeRotation(card.rotationDeg + action.deltaDeg),
                }
              : card
          ),
        },
      };
    case "workspace.cardFlipped":
      return {
        ...current,
        canvas: {
          ...current.canvas,
          cards: current.canvas.cards.map((card) =>
            card.id === action.cardId
              ? {
                  ...card,
                  isFaceUp: !card.isFaceUp,
                }
              : card
          ),
        },
      };
  }
}
