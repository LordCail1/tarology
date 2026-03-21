import { beforeEach, describe, expect, it } from "vitest";
import {
  READING_STUDIO_FREEFORM_VIEW_STORAGE_KEY,
  readPersistedFreeformViewState,
  writePersistedFreeformViewState,
} from "./reading-studio-freeform-view";

describe("reading-studio-freeform-view", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("falls back to the default view state when the stored JSON is invalid", () => {
    window.localStorage.setItem(READING_STUDIO_FREEFORM_VIEW_STORAGE_KEY, "{bad-json");

    expect(readPersistedFreeformViewState(window.localStorage, "reading-1")).toEqual({
      panXPx: 0,
      panYPx: 0,
      zoomLevel: 1,
    });
  });

  it("reads and writes view state per reading id", () => {
    writePersistedFreeformViewState(window.localStorage, "reading-1", {
      panXPx: 180,
      panYPx: -24,
      zoomLevel: 0.8,
    });
    writePersistedFreeformViewState(window.localStorage, "reading-2", {
      panXPx: -90,
      panYPx: 140,
      zoomLevel: 1.2,
    });

    expect(readPersistedFreeformViewState(window.localStorage, "reading-1")).toEqual({
      panXPx: 180,
      panYPx: -24,
      zoomLevel: 0.8,
    });
    expect(readPersistedFreeformViewState(window.localStorage, "reading-2")).toEqual({
      panXPx: -90,
      panYPx: 140,
      zoomLevel: 1.2,
    });
  });
});
