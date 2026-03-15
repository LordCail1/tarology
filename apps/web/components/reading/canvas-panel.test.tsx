import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { applyWorkspaceAction } from "../../lib/reading-studio-actions";
import {
  resolveGridPixelPosition,
} from "../../lib/reading-studio-canvas";
import { readingStudioSeedSnapshot } from "../../lib/reading-studio-mock";
import type { ReadingStudioWorkspace } from "../../lib/reading-studio-types";
import { CanvasPanel } from "./canvas-panel";

function CanvasPanelHarness() {
  const activeReadingId =
    readingStudioSeedSnapshot.activeReadingId ?? readingStudioSeedSnapshot.history[0].id;
  const [workspace, setWorkspace] = useState<ReadingStudioWorkspace>(
    readingStudioSeedSnapshot.workspaces[activeReadingId]
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  return (
    <CanvasPanel
      workspace={workspace}
      selectedCardId={selectedCardId}
      onOpenLeftPanel={() => undefined}
      onOpenRightPanel={() => undefined}
      onSelectCard={setSelectedCardId}
      onModeChange={(mode) =>
        setWorkspace((current) =>
          applyWorkspaceAction(current, {
            type: "workspace.modeSwitched",
            mode,
          })
        )
      }
      onMoveCard={(cardId, payload) =>
        setWorkspace((current) =>
          applyWorkspaceAction(current, {
            type: "workspace.cardMoved",
            cardId,
            ...payload,
          })
        )
      }
      onRotateCard={(cardId, deltaDeg) =>
        setWorkspace((current) =>
          applyWorkspaceAction(current, {
            type: "workspace.cardRotated",
            cardId,
            deltaDeg,
          })
        )
      }
      onFlipCard={(cardId) =>
        setWorkspace((current) =>
          applyWorkspaceAction(current, {
            type: "workspace.cardFlipped",
            cardId,
          })
        )
      }
    />
  );
}

function dispatchMouseDrag(
  element: HTMLElement,
  start: { clientX: number; clientY: number },
  end?: { clientX: number; clientY: number }
) {
  fireEvent.mouseDown(element, start);

  if (end) {
    fireEvent.mouseMove(window, end);
  }

  fireEvent.mouseUp(window, end ?? start);
}

describe("CanvasPanel", () => {
  it("persists freeform drag positions on pointer release", async () => {
    render(<CanvasPanelHarness />);

    const magicianCard = screen.getByRole("button", { name: "The Magician card" });
    dispatchMouseDrag(
      magicianCard,
      { clientX: 50, clientY: 80 },
      { clientX: 320, clientY: 260 }
    );
    await waitFor(() => expect(magicianCard).toHaveAttribute("aria-pressed", "true"));

    await waitFor(() => {
      expect(magicianCard.style.left).toBe("310px");
      expect(magicianCard.style.top).toBe("252px");
    });
  });

  it("rotates and flips only the selected card", async () => {
    render(<CanvasPanelHarness />);

    const magicianCard = screen.getByRole("button", { name: "The Magician card" });
    dispatchMouseDrag(magicianCard, { clientX: 50, clientY: 80 });
    await waitFor(() => expect(magicianCard).toHaveAttribute("aria-pressed", "true"));

    fireEvent.click(screen.getByRole("button", { name: "Rotate +15°" }));
    fireEvent.click(screen.getByRole("button", { name: "Flip" }));

    await waitFor(() => expect(screen.getByText("Hidden card")).toBeInTheDocument());
    expect(screen.getByText("The Star")).toBeInTheDocument();
  });

  it("snaps cards to the nearest grid cell in grid mode", async () => {
    render(<CanvasPanelHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Grid" }));

    const magicianCard = screen.getByRole("button", { name: "The Magician card" });
    dispatchMouseDrag(
      magicianCard,
      { clientX: 50, clientY: 80 },
      { clientX: 440, clientY: 180 }
    );
    await waitFor(() => expect(magicianCard).toHaveAttribute("aria-pressed", "true"));

    const snappedPosition = resolveGridPixelPosition({ column: 2, row: 1 }, undefined);

    await waitFor(() => {
      expect(Number.parseFloat(magicianCard.style.left)).toBeCloseTo(snappedPosition.xPx, 4);
      expect(Number.parseFloat(magicianCard.style.top)).toBeCloseTo(snappedPosition.yPx, 4);
    });
  });
});
