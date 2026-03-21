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

    expect(
      readPersistedFreeformViewState(window.localStorage, "reading-1", {
        widthPx: 960,
        heightPx: 640,
      })
    ).toEqual({
      panXPx: 0,
      panYPx: 0,
      zoomLevel: 1,
    });
  });

  it("reads and writes view state per reading id", () => {
    const wideViewport = { widthPx: 1000, heightPx: 600 };
    const narrowViewport = { widthPx: 600, heightPx: 400 };

    writePersistedFreeformViewState(
      window.localStorage,
      "reading-1",
      {
        panXPx: 180,
        panYPx: -24,
        zoomLevel: 0.8,
      },
      wideViewport
    );
    writePersistedFreeformViewState(
      window.localStorage,
      "reading-2",
      {
        panXPx: -90,
        panYPx: 140,
        zoomLevel: 1.2,
      },
      wideViewport
    );

    expect(readPersistedFreeformViewState(window.localStorage, "reading-1", wideViewport)).toEqual({
      panXPx: 180,
      panYPx: -24,
      zoomLevel: 0.8,
    });
    expect(readPersistedFreeformViewState(window.localStorage, "reading-2", wideViewport)).toEqual({
      panXPx: -90,
      panYPx: 140,
      zoomLevel: 1.2,
    });

    expect(
      readPersistedFreeformViewState(window.localStorage, "reading-1", narrowViewport)
    ).toEqual({
      panXPx: -20,
      panYPx: -124,
      zoomLevel: 0.8,
    });
  });

  it("recovers from malformed JSON on write by replacing it with a fresh record", () => {
    window.localStorage.setItem(READING_STUDIO_FREEFORM_VIEW_STORAGE_KEY, "{bad-json");

    writePersistedFreeformViewState(
      window.localStorage,
      "reading-1",
      {
        panXPx: 120,
        panYPx: -40,
        zoomLevel: 1.1,
      },
      {
        widthPx: 960,
        heightPx: 640,
      }
    );

    expect(
      readPersistedFreeformViewState(window.localStorage, "reading-1", {
        widthPx: 960,
        heightPx: 640,
      })
    ).toEqual({
      panXPx: 120,
      panYPx: -40,
      zoomLevel: 1.1,
    });
  });
});
