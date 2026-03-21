import React, { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { applyWorkspaceAction } from "../../lib/reading-studio-actions";
import { resolveGridPixelPosition } from "../../lib/reading-studio-canvas";
import {
  readPersistedFreeformViewState,
  writePersistedFreeformViewState,
} from "../../lib/reading-studio-freeform-view";
import { readingStudioSeedSnapshot } from "../../lib/reading-studio-mock";
import type { ReadingStudioWorkspace } from "../../lib/reading-studio-types";
import { CanvasPanel } from "./canvas-panel";

async function withMockPointerEvent(
  callback: () => Promise<void> | void,
  value: unknown = MouseEvent
) {
  const originalPointerEvent = window.PointerEvent;
  const hadOwnPointerEvent = Object.prototype.hasOwnProperty.call(
    window,
    "PointerEvent"
  );

  Object.defineProperty(window, "PointerEvent", {
    configurable: true,
    writable: true,
    value: value as typeof window.PointerEvent,
  });

  try {
    await callback();
  } finally {
    if (hadOwnPointerEvent) {
      Object.defineProperty(window, "PointerEvent", {
        configurable: true,
        writable: true,
        value: originalPointerEvent,
      });
    } else {
      Reflect.deleteProperty(window, "PointerEvent");
    }
  }
}

function CanvasPanelHarness(props?: {
  workspace?: ReadingStudioWorkspace;
  layoutSignature?: string;
  selectedCardId?: string | null;
}) {
  const activeReadingId =
    readingStudioSeedSnapshot.activeReadingId ?? readingStudioSeedSnapshot.history[0].id;
  const [workspace, setWorkspace] = useState<ReadingStudioWorkspace>(
    props?.workspace ?? readingStudioSeedSnapshot.workspaces[activeReadingId]
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    props?.selectedCardId ?? null
  );

  return (
    <CanvasPanel
      workspace={workspace}
      selectedCardId={selectedCardId}
      layoutSignature={props?.layoutSignature ?? "desktop:1440:left-open:280:right-closed:320"}
      isLayoutResizing={false}
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

function WideSpreadHarness() {
  const activeReadingId =
    readingStudioSeedSnapshot.activeReadingId ?? readingStudioSeedSnapshot.history[0].id;
  const workspace = structuredClone(readingStudioSeedSnapshot.workspaces[activeReadingId]);
  workspace.canvas.cards = workspace.canvas.cards.map((card, index) => {
    if (index === 0) {
      return {
        ...card,
        freeform: {
          ...card.freeform,
          xPx: -18240,
          yPx: -10480,
        },
      };
    }

    if (index === 1) {
      return {
        ...card,
        freeform: {
          ...card.freeform,
          xPx: 21480,
          yPx: 14420,
        },
      };
    }

    return card;
  });

  return <CanvasPanelHarness workspace={workspace} />;
}

function LayoutShiftHarness() {
  const [layoutSignature, setLayoutSignature] = useState("desktop:wide");

  return (
    <>
      <button type="button" onClick={() => setLayoutSignature("desktop:narrow")}>
        Shrink layout
      </button>
      <CanvasPanelHarness layoutSignature={layoutSignature} />
    </>
  );
}

function ReadingSwitchHarness() {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const readingIds = readingStudioSeedSnapshot.history.map((reading) => reading.id);
  const [activeReadingId, setActiveReadingId] = useState(readingIds[0]);
  const workspace = readingStudioSeedSnapshot.workspaces[activeReadingId];

  return (
    <>
      <button type="button" onClick={() => setActiveReadingId(readingIds[0])}>
        Open first reading
      </button>
      <button type="button" onClick={() => setActiveReadingId(readingIds[1])}>
        Open second reading
      </button>
      <CanvasPanel
        workspace={workspace}
        selectedCardId={selectedCardId}
        layoutSignature="desktop:1440:left-open:280:right-closed:320"
        isLayoutResizing={false}
        onOpenLeftPanel={() => undefined}
        onOpenRightPanel={() => undefined}
        onSelectCard={setSelectedCardId}
        onModeChange={() => undefined}
        onMoveCard={() => undefined}
        onRotateCard={() => undefined}
        onFlipCard={() => undefined}
      />
    </>
  );
}

function dispatchMouseDrag(
  element: HTMLElement,
  start: { button?: number; clientX: number; clientY: number },
  end?: { button?: number; clientX: number; clientY: number }
) {
  const startButton = start.button ?? 0;
  const activeButtons = startButton === 1 ? 4 : 1;

  fireEvent.mouseDown(element, {
    ...start,
    button: startButton,
    buttons: activeButtons,
  });

  if (end) {
    fireEvent.mouseMove(window, {
      ...end,
      button: startButton,
      buttons: activeButtons,
    });
  }

  fireEvent.mouseUp(window, {
    ...(end ?? start),
    button: startButton,
    buttons: 0,
  });
}

describe("CanvasPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

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

  it("tears down touch-driven freeform card drags on pointercancel without persisting them", async () => {
    await withMockPointerEvent(async () => {
      render(<CanvasPanelHarness />);

      const magicianCard = screen.getByRole("button", { name: "The Magician card" });
      expect(magicianCard.style.left).toBe("40px");
      expect(magicianCard.style.top).toBe("72px");

      fireEvent.pointerDown(magicianCard, {
        button: 0,
        buttons: 1,
        clientX: 80,
        clientY: 120,
        pointerId: 1,
        pointerType: "touch",
      });
      fireEvent.pointerMove(window, {
        button: 0,
        buttons: 1,
        clientX: 260,
        clientY: 280,
        pointerId: 1,
        pointerType: "touch",
      });

      await waitFor(() => {
        expect(magicianCard.style.left).not.toBe("40px");
        expect(magicianCard.style.top).not.toBe("72px");
      });

      fireEvent.pointerCancel(window, {
        button: 0,
        buttons: 0,
        clientX: 260,
        clientY: 280,
        pointerId: 1,
        pointerType: "touch",
      });

      await waitFor(() => {
        expect(magicianCard.style.left).toBe("40px");
        expect(magicianCard.style.top).toBe("72px");
      });

      fireEvent.pointerMove(window, {
        button: 0,
        buttons: 0,
        clientX: 360,
        clientY: 340,
        pointerId: 1,
        pointerType: "touch",
      });

      await waitFor(() => {
        expect(magicianCard.style.left).toBe("40px");
        expect(magicianCard.style.top).toBe("72px");
      });
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

  it("pans freeform by dragging the background", async () => {
    render(<CanvasPanelHarness />);

    const viewport = screen.getByLabelText("Reading canvas viewport");
    expect((viewport as HTMLDivElement).style.touchAction).toBe("none");

    dispatchMouseDrag(
      viewport,
      { button: 0, clientX: 220, clientY: 180 },
      { button: 0, clientX: 300, clientY: 250 }
    );

    await waitFor(() => {
      expect(viewport).toHaveAttribute("data-view-pan-x", "80");
      expect(viewport).toHaveAttribute("data-view-pan-y", "70");
    });
  });

  it("pans freeform through the pointer-event background path", async () => {
    await withMockPointerEvent(async () => {
      render(<CanvasPanelHarness />);

      const viewport = screen.getByLabelText("Reading canvas viewport");

      fireEvent.pointerDown(viewport, {
        button: 0,
        buttons: 1,
        clientX: 220,
        clientY: 180,
        pointerId: 1,
        pointerType: "mouse",
      });
      fireEvent.pointerMove(window, {
        button: 0,
        buttons: 1,
        clientX: 300,
        clientY: 250,
        pointerId: 1,
        pointerType: "mouse",
      });
      fireEvent.pointerUp(window, {
        button: 0,
        buttons: 0,
        clientX: 300,
        clientY: 250,
        pointerId: 1,
        pointerType: "mouse",
      });

      await waitFor(() => {
        expect(viewport).toHaveAttribute("data-view-pan-x", "80");
        expect(viewport).toHaveAttribute("data-view-pan-y", "70");
        expect(viewport).toHaveAttribute("data-panning", "false");
      });
    });
  });

  it("ends pointer-based freeform panning on pointercancel", async () => {
    await withMockPointerEvent(async () => {
      render(<CanvasPanelHarness />);

      const viewport = screen.getByLabelText("Reading canvas viewport");

      fireEvent.pointerDown(viewport, {
        button: 0,
        buttons: 1,
        clientX: 220,
        clientY: 180,
        pointerId: 1,
        pointerType: "touch",
      });
      fireEvent.pointerMove(window, {
        button: 0,
        buttons: 1,
        clientX: 300,
        clientY: 250,
        pointerId: 1,
        pointerType: "touch",
      });

      await waitFor(() => {
        expect(viewport).toHaveAttribute("data-panning", "true");
        expect(viewport).toHaveAttribute("data-view-pan-x", "80");
        expect(viewport).toHaveAttribute("data-view-pan-y", "70");
      });

      fireEvent.pointerCancel(window, {
        button: 0,
        buttons: 0,
        clientX: 300,
        clientY: 250,
        pointerId: 1,
        pointerType: "touch",
      });

      await waitFor(() => {
        expect(viewport).toHaveAttribute("data-panning", "false");
      });

      fireEvent.pointerMove(window, {
        button: 0,
        buttons: 0,
        clientX: 360,
        clientY: 320,
        pointerId: 1,
        pointerType: "touch",
      });

      await waitFor(() => {
        expect(viewport).toHaveAttribute("data-view-pan-x", "80");
        expect(viewport).toHaveAttribute("data-view-pan-y", "70");
      });
    });
  });

  it("pans freeform with middle mouse drag", async () => {
    render(<CanvasPanelHarness />);

    const viewport = screen.getByLabelText("Reading canvas viewport");

    dispatchMouseDrag(
      viewport,
      { button: 1, clientX: 260, clientY: 220 },
      { button: 1, clientX: 180, clientY: 150 }
    );

    await waitFor(() => {
      expect(viewport).toHaveAttribute("data-view-pan-x", "-80");
      expect(viewport).toHaveAttribute("data-view-pan-y", "-70");
    });
  });

  it("ends middle-mouse pan if the release event is missed", async () => {
    render(<CanvasPanelHarness />);

    const viewport = screen.getByLabelText("Reading canvas viewport");

    fireEvent.mouseDown(viewport, {
      button: 1,
      buttons: 4,
      clientX: 260,
      clientY: 220,
    });
    fireEvent.mouseMove(window, {
      button: 1,
      buttons: 4,
      clientX: 180,
      clientY: 150,
    });

    await waitFor(() => {
      expect(viewport).toHaveAttribute("data-panning", "true");
      expect(viewport).toHaveAttribute("data-view-pan-x", "-80");
      expect(viewport).toHaveAttribute("data-view-pan-y", "-70");
    });

    fireEvent.mouseMove(window, {
      button: 0,
      buttons: 0,
      clientX: 150,
      clientY: 130,
    });

    await waitFor(() => {
      expect(viewport).toHaveAttribute("data-panning", "false");
      expect(viewport).toHaveAttribute("data-view-pan-x", "-80");
      expect(viewport).toHaveAttribute("data-view-pan-y", "-70");
    });

    fireEvent.mouseMove(window, {
      button: 0,
      buttons: 0,
      clientX: 120,
      clientY: 110,
    });

    await waitFor(() => {
      expect(viewport).toHaveAttribute("data-view-pan-x", "-80");
      expect(viewport).toHaveAttribute("data-view-pan-y", "-70");
    });
  });

  it("pans freeform with Space plus drag", async () => {
    render(<CanvasPanelHarness />);

    const viewport = screen.getByLabelText("Reading canvas viewport");

    fireEvent.keyDown(window, { key: " ", code: "Space", charCode: 32 });
    await waitFor(() =>
      expect(viewport).toHaveAttribute("data-pan-ready", "true")
    );

    dispatchMouseDrag(
      viewport,
      { button: 0, clientX: 240, clientY: 210 },
      { button: 0, clientX: 150, clientY: 120 }
    );
    fireEvent.keyUp(window, { key: " ", code: "Space", charCode: 32 });

    await waitFor(() => {
      expect(viewport).toHaveAttribute("data-view-pan-x", "-90");
      expect(viewport).toHaveAttribute("data-view-pan-y", "-90");
    });
    await waitFor(() =>
      expect(viewport).toHaveAttribute("data-pan-ready", "false")
    );
  });

  it("keeps Space keyboard activation on focused canvas controls", async () => {
    render(<CanvasPanelHarness />);

    const viewport = screen.getByLabelText("Reading canvas viewport");
    const fitSpreadButton = screen.getByRole("button", { name: "Fit Spread" });
    fitSpreadButton.focus();

    fireEvent.keyDown(window, { key: " ", code: "Space", charCode: 32 });

    await waitFor(() => {
      expect(viewport).toHaveAttribute("data-pan-ready", "false");
    });
    expect(document.activeElement).toBe(fitSpreadButton);
  });

  it("does not arm Space panning or prevent default in grid mode", async () => {
    render(<CanvasPanelHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Grid" }));

    const viewport = screen.getByLabelText("Reading canvas viewport");
    const keyDownEvent = new KeyboardEvent("keydown", {
      key: " ",
      code: "Space",
      bubbles: true,
      cancelable: true,
    });

    act(() => {
      window.dispatchEvent(keyDownEvent);
    });

    await waitFor(() => {
      expect(viewport).toHaveAttribute("data-pan-ready", "false");
    });
    expect(keyDownEvent.defaultPrevented).toBe(false);
  });

  it("pans freeform immediately on wheel input", async () => {
    render(<CanvasPanelHarness />);

    const viewport = screen.getByLabelText("Reading canvas viewport");

    fireEvent.wheel(viewport, {
      deltaX: 90,
      deltaY: 45,
      deltaMode: 0,
    });

    await waitFor(() => {
      expect(viewport).toHaveAttribute("data-view-pan-x", "-90");
      expect(viewport).toHaveAttribute("data-view-pan-y", "-45");
    });
  });

  it("zooms freeform on Ctrl plus wheel", async () => {
    render(<CanvasPanelHarness />);

    const viewport = screen.getByLabelText("Reading canvas viewport");
    const wheelEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -200,
      deltaMode: 0,
      ctrlKey: true,
      clientX: 360,
      clientY: 240,
    });
    act(() => {
      viewport.dispatchEvent(wheelEvent);
    });

    await waitFor(() => {
      expect(Number(viewport.getAttribute("data-view-zoom"))).toBeGreaterThan(1);
    });
    expect(wheelEvent.defaultPrevented).toBe(true);
  });

  it("compounds rapid Ctrl plus wheel zoom bursts from the latest view state", async () => {
    render(<CanvasPanelHarness />);

    const viewport = screen.getByLabelText("Reading canvas viewport");
    const firstWheelEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -200,
      deltaMode: 0,
      ctrlKey: true,
      clientX: 360,
      clientY: 240,
    });
    const secondWheelEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -200,
      deltaMode: 0,
      ctrlKey: true,
      clientX: 360,
      clientY: 240,
    });

    act(() => {
      viewport.dispatchEvent(firstWheelEvent);
      viewport.dispatchEvent(secondWheelEvent);
    });

    await waitFor(() => {
      expect(Number(viewport.getAttribute("data-view-zoom"))).toBeCloseTo(1.8, 3);
    });
    expect(firstWheelEvent.defaultPrevented).toBe(true);
    expect(secondWheelEvent.defaultPrevented).toBe(true);
  });

  it("keeps the same world center after layout tightening", async () => {
    const activeReadingId =
      readingStudioSeedSnapshot.activeReadingId ?? readingStudioSeedSnapshot.history[0].id;
    writePersistedFreeformViewState(
      window.localStorage,
      activeReadingId,
      {
        panXPx: 0,
        panYPx: 0,
        zoomLevel: 1,
      },
      {
        widthPx: 960,
        heightPx: 640,
      }
    );

    render(<LayoutShiftHarness />);

    const viewport = screen.getByLabelText("Reading canvas viewport");
    let viewportWidthPx = 960;
    let viewportHeightPx = 640;

    Object.defineProperty(viewport, "clientWidth", {
      configurable: true,
      get() {
        return viewportWidthPx;
      },
    });
    Object.defineProperty(viewport, "clientHeight", {
      configurable: true,
      get() {
        return viewportHeightPx;
      },
    });

    viewportWidthPx = 560;
    viewportHeightPx = 540;
    fireEvent.click(screen.getByRole("button", { name: "Shrink layout" }));

    await waitFor(() => {
      expect(viewport).toHaveAttribute("data-view-pan-x", "-200");
      expect(viewport).toHaveAttribute("data-view-pan-y", "-50");
    });
  });

  it("fits the spread by zooming out and reframing far-apart cards", async () => {
    render(<WideSpreadHarness />);

    const viewport = screen.getByLabelText("Reading canvas viewport");
    Object.defineProperty(viewport, "clientWidth", {
      configurable: true,
      value: 960,
    });
    Object.defineProperty(viewport, "clientHeight", {
      configurable: true,
      value: 640,
    });

    fireEvent.click(screen.getByRole("button", { name: "Fit Spread" }));

    await waitFor(() => {
      expect(Number(viewport.getAttribute("data-view-zoom"))).toBeLessThan(0.05);
      expect(Number(viewport.getAttribute("data-view-pan-x"))).not.toBe(0);
      expect(Number(viewport.getAttribute("data-view-pan-y"))).not.toBe(0);
    });
  });

  it("flushes pending freeform camera persistence before switching readings", async () => {
    render(<ReadingSwitchHarness />);

    const viewport = screen.getByLabelText("Reading canvas viewport");
    dispatchMouseDrag(
      viewport,
      { button: 0, clientX: 220, clientY: 180 },
      { button: 0, clientX: 300, clientY: 250 }
    );

    await waitFor(() => {
      expect(viewport).toHaveAttribute("data-view-pan-x", "80");
      expect(viewport).toHaveAttribute("data-view-pan-y", "70");
    });

    fireEvent.click(screen.getByRole("button", { name: "Open second reading" }));

    await waitFor(() => {
      expect(
        readPersistedFreeformViewState(window.localStorage, "rdg_001", {
          widthPx: 960,
          heightPx: 640,
        })
      ).toEqual({
        panXPx: 80,
        panYPx: 70,
        zoomLevel: 1,
      });
    });
  });
});
