import { beforeEach, describe, expect, it } from "vitest";
import {
  READING_STUDIO_LAYOUT_STORAGE_KEY,
  createLocalReadingStudioPreferenceAdapter,
} from "./reading-studio-preferences";

describe("reading-studio-preferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  it("falls back to defaults when stored JSON is invalid", async () => {
    window.localStorage.setItem(READING_STUDIO_LAYOUT_STORAGE_KEY, "{not-json");

    const adapter = createLocalReadingStudioPreferenceAdapter(window.localStorage);
    await expect(adapter.readLayoutPreferences()).resolves.toEqual({
      leftOpen: true,
      rightOpen: false,
      leftWidthPx: 280,
      rightWidthPx: 320,
    });
  });

  it("writes and reads persisted layout preferences", async () => {
    const adapter = createLocalReadingStudioPreferenceAdapter(window.localStorage);

    await adapter.writeLayoutPreferences({
      leftOpen: false,
      rightOpen: true,
      leftWidthPx: 312,
      rightWidthPx: 388,
    });

    await expect(adapter.readLayoutPreferences()).resolves.toEqual({
      leftOpen: false,
      rightOpen: true,
      leftWidthPx: 312,
      rightWidthPx: 388,
    });
  });
});
