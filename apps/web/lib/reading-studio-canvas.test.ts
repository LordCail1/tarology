import { describe, expect, it } from "vitest";
import {
  DEFAULT_CANVAS_ZOOM,
  MIN_INTERACTIVE_CANVAS_ZOOM,
  clampInteractiveCanvasZoom,
  clampFreeformPosition,
  getHighestStackOrder,
  resolveFreeformContentBounds,
  resolveFreeformFitViewState,
  resolveFreeformViewportPoint,
  resolveViewportCenteredFreeformViewState,
  resolveZoomedFreeformViewState,
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

  it("lets Fit Spread zoom below the interactive minimum when the spread is huge", () => {
    const viewState = resolveFreeformFitViewState({
      bounds: {
        leftPx: -18000,
        topPx: -12000,
        widthPx: 42000,
        heightPx: 26000,
      },
      viewportMetrics: {
        widthPx: 960,
        heightPx: 640,
      },
    });

    expect(viewState.zoomLevel).toBeLessThan(MIN_INTERACTIVE_CANVAS_ZOOM);
    expect(viewState.zoomLevel).toBeCloseTo(960 / 42000, 6);
  });

  it("does not snap sub-floor fit zoom back up on a further zoom-out request", () => {
    expect(
      clampInteractiveCanvasZoom({
        currentZoom: 0.02,
        proposedZoom: 0.01,
      })
    ).toBeCloseTo(0.02, 6);

    expect(
      clampInteractiveCanvasZoom({
        currentZoom: 0.02,
        proposedZoom: 0.03,
      })
    ).toBeCloseTo(0.03, 6);
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

  it("stabilizes the center world point across viewport size changes", () => {
    expect(
      resolveViewportCenteredFreeformViewState({
        previousViewportMetrics: {
          widthPx: 1000,
          heightPx: 600,
        },
        nextViewportMetrics: {
          widthPx: 600,
          heightPx: 400,
        },
        viewState: {
          panXPx: 50,
          panYPx: -30,
          zoomLevel: 1.5,
        },
      })
    ).toEqual({
      panXPx: -150,
      panYPx: -130,
      zoomLevel: 1.5,
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
        },
      ])
    ).toBe(8);
  });
});
