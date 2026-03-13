import { describe, expect, it } from "vitest";
import { applyLayoutAction } from "./reading-studio-actions";

describe("applyLayoutAction", () => {
  it("rebalances saved widths when reopening a sidebar on desktop", () => {
    expect(
      applyLayoutAction(
        {
          leftOpen: true,
          rightOpen: false,
          leftWidthPx: 420,
          rightWidthPx: 460,
        },
        {
          type: "layout.panelToggled",
          side: "right",
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
