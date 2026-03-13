import { beforeEach, describe, expect, it } from "vitest";
import {
  clampPanelWidth,
  coerceLayoutPreferences,
  getDefaultLayoutPreferences,
} from "./reading-studio-layout";

describe("reading-studio-layout", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  it("returns desktop and mobile defaults", () => {
    expect(getDefaultLayoutPreferences(1440)).toEqual({
      leftOpen: true,
      rightOpen: false,
      leftWidthPx: 280,
      rightWidthPx: 320,
    });

    expect(getDefaultLayoutPreferences(768)).toEqual({
      leftOpen: false,
      rightOpen: false,
      leftWidthPx: 280,
      rightWidthPx: 320,
    });
  });

  it("clamps panel widths against min, max, and center width protection", () => {
    const layout = {
      leftOpen: true,
      rightOpen: true,
      leftWidthPx: 280,
      rightWidthPx: 320,
    };

    expect(clampPanelWidth(layout, "left", 420, 1024)).toBe(284);
    expect(clampPanelWidth(layout, "right", 460, 1024)).toBe(324);
    expect(clampPanelWidth(layout, "left", 120, 1440)).toBe(240);
  });

  it("coerces partial layout preferences against sane defaults", () => {
    expect(
      coerceLayoutPreferences(
        {
          leftOpen: false,
          rightOpen: true,
          leftWidthPx: 999,
          rightWidthPx: 999,
        },
        1440
      )
    ).toEqual({
      leftOpen: false,
      rightOpen: true,
      leftWidthPx: 420,
      rightWidthPx: 460,
    });
  });

  it("rebalances restored desktop widths together to preserve the center column", () => {
    expect(
      coerceLayoutPreferences(
        {
          leftOpen: true,
          rightOpen: true,
          leftWidthPx: 420,
          rightWidthPx: 460,
        },
        1024
      )
    ).toEqual({
      leftOpen: true,
      rightOpen: true,
      leftWidthPx: 282,
      rightWidthPx: 322,
    });
  });
});
