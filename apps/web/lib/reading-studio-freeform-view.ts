import {
  clampCanvasZoom,
  getDefaultFreeformViewState,
  resolveCanvasMetrics,
  type CanvasMetrics,
  type FreeformViewState,
} from "./reading-studio-canvas";

export const READING_STUDIO_FREEFORM_VIEW_STORAGE_KEY =
  "tarology.ui.readingStudioFreeformView";

interface PersistedFreeformViewState {
  centerXPx?: number;
  centerYPx?: number;
  panXPx?: number;
  panYPx?: number;
  zoomLevel?: number;
}

type PersistedViewRecord = Record<string, PersistedFreeformViewState>;

function coercePersistedViewState(
  value: PersistedFreeformViewState | undefined,
  viewportMetrics: Partial<CanvasMetrics> | undefined
): FreeformViewState {
  const defaults = getDefaultFreeformViewState();
  const resolvedViewportMetrics = resolveCanvasMetrics(viewportMetrics);
  const zoomLevel = clampCanvasZoom(value?.zoomLevel ?? defaults.zoomLevel);

  if (
    typeof value?.centerXPx === "number" &&
    Number.isFinite(value.centerXPx) &&
    typeof value?.centerYPx === "number" &&
    Number.isFinite(value.centerYPx)
  ) {
    return {
      panXPx: resolvedViewportMetrics.widthPx / 2 - value.centerXPx * zoomLevel,
      panYPx: resolvedViewportMetrics.heightPx / 2 - value.centerYPx * zoomLevel,
      zoomLevel,
    };
  }

  return {
    panXPx:
      typeof value?.panXPx === "number" && Number.isFinite(value.panXPx)
        ? value.panXPx
        : defaults.panXPx,
    panYPx:
      typeof value?.panYPx === "number" && Number.isFinite(value.panYPx)
        ? value.panYPx
        : defaults.panYPx,
    zoomLevel,
  };
}

export function readPersistedFreeformViewState(
  storage: Storage | undefined,
  readingId: string,
  viewportMetrics: Partial<CanvasMetrics> | undefined
): FreeformViewState {
  if (!storage) {
    return getDefaultFreeformViewState();
  }

  try {
    const rawValue = storage.getItem(READING_STUDIO_FREEFORM_VIEW_STORAGE_KEY);
    if (!rawValue) {
      return getDefaultFreeformViewState();
    }

    const parsed = JSON.parse(rawValue) as PersistedViewRecord;
    return coercePersistedViewState(parsed?.[readingId], viewportMetrics);
  } catch {
    return getDefaultFreeformViewState();
  }
}

export function writePersistedFreeformViewState(
  storage: Storage | undefined,
  readingId: string,
  viewState: FreeformViewState,
  viewportMetrics: Partial<CanvasMetrics> | undefined
): void {
  if (!storage) {
    return;
  }

  try {
    const rawValue = storage.getItem(READING_STUDIO_FREEFORM_VIEW_STORAGE_KEY);
    let parsed: PersistedViewRecord = {};

    if (rawValue) {
      try {
        parsed = JSON.parse(rawValue) as PersistedViewRecord;
      } catch {
        parsed = {};
      }
    }

    const resolvedViewportMetrics = resolveCanvasMetrics(viewportMetrics);
    const zoomLevel = clampCanvasZoom(viewState.zoomLevel);
    parsed[readingId] = {
      centerXPx: (resolvedViewportMetrics.widthPx / 2 - viewState.panXPx) / zoomLevel,
      centerYPx: (resolvedViewportMetrics.heightPx / 2 - viewState.panYPx) / zoomLevel,
      zoomLevel,
    };
    storage.setItem(READING_STUDIO_FREEFORM_VIEW_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage write failures.
  }
}
