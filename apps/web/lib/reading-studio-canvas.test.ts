import { describe, expect, it } from "vitest";
import {
  DEFAULT_CANVAS_ZOOM,
  clampFreeformPosition,
  resolveCanvasContentMetrics,
  resolveCanvasWorldMetrics,
  resolveFitCanvasZoom,
  getHighestStackOrder,
  resolveScaledCanvasMetrics,
  resolveGridPixelPosition,
  resolveViewportRevealScroll,
  snapGridPosition,
} from "./reading-studio-canvas";

describe("reading-studio-canvas", () => {
  it("clamps freeform positions to non-negative coordinates without forcing them back into the visible viewport", () => {
    expect(
      clampFreeformPosition(
        {
          xPx: 1200,
          yPx: -20,
        },
        {
          widthPx: 900,
          heightPx: 600,
        }
      )
    ).toEqual({
      xPx: 1200,
      yPx: 0,
    });
  });

  it("expands freeform content metrics to keep the furthest card reachable", () => {
    expect(
      resolveCanvasContentMetrics("freeform", [
        {
          freeform: {
            xPx: 1180,
            yPx: 720,
            stackOrder: 1,
          },
        },
      ])
    ).toEqual({
      widthPx: 1400,
      heightPx: 1012,
    });
  });

  it("keeps the world at least as large as the current viewport after zooming out", () => {
    expect(
      resolveCanvasWorldMetrics({
        mode: "freeform",
        cards: [],
        viewportMetrics: {
          widthPx: 1000,
          heightPx: 700,
        },
        zoomLevel: 0.5,
      })
    ).toEqual({
      widthPx: 2000,
      heightPx: 1400,
    });
  });

  it("resolves scaled world metrics from zoom level", () => {
    expect(
      resolveScaledCanvasMetrics(
        {
          widthPx: 1200,
          heightPx: 800,
        },
        1.5
      )
    ).toEqual({
      widthPx: 1800,
      heightPx: 1200,
    });
  });

  it("computes a fit zoom that can zoom out to show a larger spread", () => {
    expect(
      resolveFitCanvasZoom(
        {
          widthPx: 1800,
          heightPx: 1200,
        },
        {
          widthPx: 900,
          heightPx: 600,
        }
      )
    ).toBeCloseTo(0.5, 4);
    expect(
      resolveFitCanvasZoom(
        {
          widthPx: 520,
          heightPx: 420,
        },
        {
          widthPx: 1200,
          heightPx: 900,
        }
      )
    ).toBe(DEFAULT_CANVAS_ZOOM);
  });

  it("returns the minimum scroll needed to keep a card visible after the viewport shrinks", () => {
    expect(
      resolveViewportRevealScroll({
        viewportMetrics: {
          widthPx: 520,
          heightPx: 420,
        },
        scrollPosition: {
          leftPx: 0,
          topPx: 0,
        },
        targetRect: {
          leftPx: 760,
          topPx: 80,
          widthPx: 124,
          heightPx: 196,
        },
        zoomLevel: 1,
      })
    ).toEqual({
      leftPx: 388,
      topPx: 0,
    });
  });

  it("snaps grid positions into the valid row and column range", () => {
    expect(snapGridPosition({ column: -1, row: 9 }, undefined)).toEqual({
      column: 0,
      row: 2,
    });
  });

  it("resolves grid cells into pixel positions", () => {
    const position = resolveGridPixelPosition(
      {
        column: 2,
        row: 1,
      },
      undefined
    );

    expect(position.xPx).toBeCloseTo(489, 4);
    expect(position.yPx).toBeCloseTo(228.6666666667, 4);
  });

  it("finds the highest freeform stack order", () => {
    expect(
      getHighestStackOrder([
        {
          id: "card_1",
          label: "The Star",
          assignedReversal: false,
          isFaceUp: true,
          rotationDeg: 0,
          freeform: {
            xPx: 10,
            yPx: 20,
            stackOrder: 2,
          },
          grid: {
            column: 0,
            row: 0,
          },
        },
        {
          id: "card_2",
          label: "The Hermit",
          assignedReversal: true,
          isFaceUp: true,
          rotationDeg: 0,
          freeform: {
            xPx: 60,
            yPx: 90,
            stackOrder: 8,
          },
          grid: {
            column: 1,
            row: 0,
          },
        },
      ])
    ).toBe(8);
  });
});
