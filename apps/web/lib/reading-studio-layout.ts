import type { PanelSide, ReadingStudioLayoutPreferences } from "./reading-studio-types";

export const DESKTOP_BREAKPOINT_PX = 1024;
export const COLLAPSED_PANEL_WIDTH_PX = 56;
export const DEFAULT_LEFT_PANEL_WIDTH_PX = 280;
export const DEFAULT_RIGHT_PANEL_WIDTH_PX = 320;
export const MIN_LEFT_PANEL_WIDTH_PX = 240;
export const MAX_LEFT_PANEL_WIDTH_PX = 420;
export const MIN_RIGHT_PANEL_WIDTH_PX = 280;
export const MAX_RIGHT_PANEL_WIDTH_PX = 460;
export const MIN_CENTER_COLUMN_WIDTH_PX = 420;
export const RESIZE_KEYBOARD_STEP_PX = 16;

export function isDesktopViewport(viewportWidth: number): boolean {
  return viewportWidth >= DESKTOP_BREAKPOINT_PX;
}

export function getViewportWidth(): number {
  if (typeof window === "undefined" || typeof window.innerWidth !== "number") {
    return DESKTOP_BREAKPOINT_PX;
  }

  return window.innerWidth;
}

export function getDefaultLayoutPreferences(
  viewportWidth: number
): ReadingStudioLayoutPreferences {
  if (!isDesktopViewport(viewportWidth)) {
    return {
      leftOpen: false,
      rightOpen: false,
      leftWidthPx: DEFAULT_LEFT_PANEL_WIDTH_PX,
      rightWidthPx: DEFAULT_RIGHT_PANEL_WIDTH_PX,
    };
  }

  return {
    leftOpen: true,
    rightOpen: false,
    leftWidthPx: DEFAULT_LEFT_PANEL_WIDTH_PX,
    rightWidthPx: DEFAULT_RIGHT_PANEL_WIDTH_PX,
  };
}

export function clampPanelWidth(
  layout: ReadingStudioLayoutPreferences,
  side: PanelSide,
  proposedWidthPx: number,
  viewportWidth: number
): number {
  const minWidth = side === "left" ? MIN_LEFT_PANEL_WIDTH_PX : MIN_RIGHT_PANEL_WIDTH_PX;
  const maxWidth = side === "left" ? MAX_LEFT_PANEL_WIDTH_PX : MAX_RIGHT_PANEL_WIDTH_PX;

  const oppositeWidth = side === "left" ? layout.rightWidthPx : layout.leftWidthPx;
  const oppositeOpen = side === "left" ? layout.rightOpen : layout.leftOpen;
  const occupiedOpposite = oppositeOpen ? oppositeWidth : COLLAPSED_PANEL_WIDTH_PX;
  const centerGuardedMax = Math.max(
    minWidth,
    viewportWidth - occupiedOpposite - MIN_CENTER_COLUMN_WIDTH_PX
  );

  return Math.max(minWidth, Math.min(proposedWidthPx, Math.min(maxWidth, centerGuardedMax)));
}

export function coerceLayoutPreferences(
  candidate: Partial<ReadingStudioLayoutPreferences> | null | undefined,
  viewportWidth: number
): ReadingStudioLayoutPreferences {
  const defaults = getDefaultLayoutPreferences(viewportWidth);

  return {
    leftOpen: candidate?.leftOpen ?? defaults.leftOpen,
    rightOpen: candidate?.rightOpen ?? defaults.rightOpen,
    leftWidthPx: clampPanelWidth(
      defaults,
      "left",
      candidate?.leftWidthPx ?? defaults.leftWidthPx,
      viewportWidth
    ),
    rightWidthPx: clampPanelWidth(
      defaults,
      "right",
      candidate?.rightWidthPx ?? defaults.rightWidthPx,
      viewportWidth
    ),
  };
}
