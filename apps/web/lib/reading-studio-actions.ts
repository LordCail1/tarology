import {
  clampPanelWidth,
  coerceLayoutPreferences,
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

function buildNextWorkspaceMetadata(current: ReadingStudioWorkspace) {
  return {
    ...current.reading,
    version: current.reading.version + 1,
    updatedAtIso: new Date().toISOString(),
  };
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
      return coerceLayoutPreferences(
        action.side === "left"
          ? { ...current, leftOpen: !current.leftOpen }
          : { ...current, rightOpen: !current.rightOpen },
        viewportWidth
      );
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
        | "workspace.cardMoved"
        | "workspace.cardRotated"
        | "workspace.cardFlipped";
    }
  >
): ReadingStudioWorkspace {
  switch (action.type) {
    case "workspace.cardMoved":
      return {
        ...current,
        reading: buildNextWorkspaceMetadata(current),
        canvas: {
          ...current.canvas,
          cards: current.canvas.cards.map((card) => {
            if (card.id !== action.cardId) {
              return card;
            }

            return {
              ...card,
              freeform: {
                ...card.freeform,
                xPx: action.freeform.xPx,
                yPx: action.freeform.yPx,
                stackOrder: getHighestStackOrder(current.canvas.cards) + 1,
              },
            };
          }),
        },
      };
    case "workspace.cardRotated":
      return {
        ...current,
        reading: buildNextWorkspaceMetadata(current),
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
        reading: buildNextWorkspaceMetadata(current),
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
