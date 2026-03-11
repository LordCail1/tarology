import { describe, expect, it } from "vitest";
import {
  clampFreeformPosition,
  getHighestStackOrder,
  resolveGridPixelPosition,
  snapGridPosition,
} from "./reading-studio-canvas";

describe("reading-studio-canvas", () => {
  it("clamps freeform positions inside the canvas bounds", () => {
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
      xPx: 776,
      yPx: 0,
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
