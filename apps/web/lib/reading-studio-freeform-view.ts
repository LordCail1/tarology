import {
  clampCanvasZoom,
  getDefaultFreeformViewState,
  type FreeformViewState,
} from "./reading-studio-canvas";

export const READING_STUDIO_FREEFORM_VIEW_STORAGE_KEY =
  "tarology.ui.readingStudioFreeformView";

type PersistedViewRecord = Record<string, Partial<FreeformViewState>>;

function coercePersistedViewState(value: Partial<FreeformViewState> | undefined): FreeformViewState {
  const defaults = getDefaultFreeformViewState();

  return {
    panXPx:
      typeof value?.panXPx === "number" && Number.isFinite(value.panXPx)
        ? value.panXPx
        : defaults.panXPx,
    panYPx:
      typeof value?.panYPx === "number" && Number.isFinite(value.panYPx)
        ? value.panYPx
        : defaults.panYPx,
    zoomLevel: clampCanvasZoom(value?.zoomLevel ?? defaults.zoomLevel),
  };
}

export function readPersistedFreeformViewState(
  storage: Storage | undefined,
  readingId: string
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
    return coercePersistedViewState(parsed?.[readingId]);
  } catch {
    return getDefaultFreeformViewState();
  }
}

export function writePersistedFreeformViewState(
  storage: Storage | undefined,
  readingId: string,
  viewState: FreeformViewState
): void {
  if (!storage) {
    return;
  }

  try {
    const rawValue = storage.getItem(READING_STUDIO_FREEFORM_VIEW_STORAGE_KEY);
    const parsed = rawValue ? (JSON.parse(rawValue) as PersistedViewRecord) : {};
    parsed[readingId] = {
      panXPx: viewState.panXPx,
      panYPx: viewState.panYPx,
      zoomLevel: clampCanvasZoom(viewState.zoomLevel),
    };
    storage.setItem(READING_STUDIO_FREEFORM_VIEW_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage write failures.
  }
}
