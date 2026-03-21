import { describe, expect, it } from "vitest";
import {
  DEFAULT_CANVAS_ZOOM,
  clampFreeformPosition,
  getHighestStackOrder,
  getGridCellSize,
  resolveFreeformContentBounds,
  resolveFreeformFitViewState,
  resolveFreeformViewportPoint,
  resolveGridPixelPosition,
  resolveViewportRevealViewState,
  resolveZoomedFreeformViewState,
  snapGridPosition,
} from "./reading-studio-canvas";

describe("reading-studio-canvas", () => {
  it("preserves negative freeform coordinates for the infinite canvas", () => {
    expect(
      clampFreeformPosition(
        {
          xPx: -220,
          yPx: -40,
        },
        {
          widthPx: 900,
          heightPx: 600,
        }
      )
    ).toEqual({
      xPx: -220,
      yPx: -40,
    });
  });

  it("resolves freeform viewport points through camera pan and zoom", () => {
    expect(
      resolveFreeformViewportPoint({
        clientXPx: 260,
        clientYPx: 180,
        viewportRect: {
          left: 20,
          top: 30,
        },
        viewState: {
          panXPx: 80,
          panYPx: -40,
          zoomLevel: 1.5,
        },
      })
    ).toEqual({
      xPx: 106.66666666666667,
      yPx: 126.66666666666667,
    });
  });

  it("computes freeform content bounds across negative and positive card positions", () => {
    expect(
      resolveFreeformContentBounds([
        {
          freeform: {
            xPx: -180,
            yPx: 60,
            stackOrder: 1,
          },
        },
        {
          freeform: {
            xPx: 640,
            yPx: -120,
            stackOrder: 2,
          },
        },
      ])
    ).toEqual({
      leftPx: -276,
      topPx: -216,
      widthPx: 1136,
      heightPx: 568,
    });
  });

  it("fits the spread into the viewport without exceeding 100% zoom", () => {
    expect(
      resolveFreeformFitViewState({
        bounds: {
          leftPx: -276,
          topPx: -216,
          widthPx: 1136,
          heightPx: 572,
        },
        viewportMetrics: {
          widthPx: 900,
          heightPx: 600,
        },
      })
    ).toEqual({
      panXPx: 218.66197183098586,
      panYPx: 244.54225352112675,
      zoomLevel: 0.7922535211267606,
    });

    expect(
      resolveFreeformFitViewState({
        bounds: {
          leftPx: 20,
          topPx: 20,
          widthPx: 320,
          heightPx: 240,
        },
        viewportMetrics: {
          widthPx: 1280,
          heightPx: 720,
        },
      }).zoomLevel
    ).toBe(DEFAULT_CANVAS_ZOOM);
  });

  it("zooms around the chosen anchor point", () => {
    expect(
      resolveZoomedFreeformViewState({
        current: {
          panXPx: 120,
          panYPx: 90,
          zoomLevel: 1,
        },
        nextZoomLevel: 1.5,
        anchorPointPx: {
          xPx: 300,
          yPx: 240,
        },
      })
    ).toEqual({
      panXPx: 30,
      panYPx: 15,
      zoomLevel: 1.5,
    });
  });

  it("nudges the camera only enough to keep a card visible", () => {
    expect(
      resolveViewportRevealViewState({
        viewportMetrics: {
          widthPx: 560,
          heightPx: 420,
        },
        viewState: {
          panXPx: -120,
          panYPx: 20,
          zoomLevel: 1,
        },
        targetRect: {
          leftPx: 620,
          topPx: 60,
          widthPx: 124,
          heightPx: 196,
        },
      })
    ).toEqual({
      panXPx: -208,
      panYPx: 20,
      zoomLevel: 1,
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

  it("keeps the current grid cell size behavior", () => {
    expect(
      getGridCellSize({
        widthPx: 960,
        heightPx: 640,
      })
    ).toEqual({
      cellWidthPx: 212.5,
      cellHeightPx: 182.66666666666666,
    });
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
