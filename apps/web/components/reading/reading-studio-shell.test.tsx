import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReadingStudioShell } from "./reading-studio-shell";

describe("ReadingStudioShell", () => {
  it("renders core shell landmarks", () => {
    render(<ReadingStudioShell />);

    expect(screen.getByRole("heading", { name: "Card Fan and Canvas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reading History" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Question Threads" })).toBeInTheDocument();
  });

  it("collapses and expands desktop side panels", () => {
    render(<ReadingStudioShell />);

    const historyToggle = screen.getByRole("button", { name: /Collapse history panel/i });
    const analysisToggle = screen.getByRole("button", { name: /Collapse analysis panel/i });

    fireEvent.click(historyToggle);
    const historyExpandButtons = screen.getAllByRole("button", {
      name: /Expand history panel/i,
    });
    expect(historyExpandButtons.length).toBeGreaterThan(0);

    fireEvent.click(analysisToggle);
    const analysisExpandButtons = screen.getAllByRole("button", {
      name: /Expand analysis panel/i,
    });
    expect(analysisExpandButtons.length).toBeGreaterThan(0);

    fireEvent.click(historyExpandButtons[0]);
    fireEvent.click(analysisExpandButtons[0]);

    expect(screen.getByRole("heading", { name: "Reading History" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Question Threads" })).toBeInTheDocument();
  });

  it("switches right-panel tabs between threads and interpretations", () => {
    render(<ReadingStudioShell />);

    fireEvent.click(screen.getByRole("tab", { name: "Interpretations" }));
    expect(screen.getByRole("heading", { name: "Interpretation History" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Question Threads" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Threads" }));
    expect(screen.getByRole("heading", { name: "Question Threads" })).toBeInTheDocument();
  });

  it("opens and closes mobile drawers with backdrop and escape", () => {
    render(<ReadingStudioShell />);

    fireEvent.click(screen.getByRole("button", { name: "Open history drawer" }));
    expect(screen.getByRole("dialog", { name: "History drawer" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close drawer backdrop" }));
    expect(screen.queryByRole("dialog", { name: "History drawer" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open analysis drawer" }));
    expect(screen.getByRole("dialog", { name: "Analysis drawer" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Analysis drawer" })).not.toBeInTheDocument();
  });

  it("filters history list content by search and status", () => {
    render(<ReadingStudioShell />);
    const historySectionHeading = screen.getByRole("heading", { name: "Reading History" });
    const historySection = historySectionHeading.closest("section");
    expect(historySection).not.toBeNull();
    if (!historySection) {
      return;
    }
    const historyScope = within(historySection);

    fireEvent.change(historyScope.getByLabelText("Search readings"), {
      target: { value: "Creative" },
    });

    expect(historyScope.getByText("Creative project momentum sprint")).toBeInTheDocument();
    expect(
      historyScope.queryByText("Career realignment and confidence")
    ).not.toBeInTheDocument();

    fireEvent.click(historyScope.getByRole("button", { name: "Paused" }));
    expect(historyScope.getByText("No readings match current filters.")).toBeInTheDocument();

    fireEvent.click(historyScope.getByRole("button", { name: "All" }));
    fireEvent.change(historyScope.getByLabelText("Search readings"), {
      target: { value: "" },
    });

    const group = historyScope.getByRole("heading", { name: "Older" }).closest("section");
    expect(group).not.toBeNull();
    if (group) {
      expect(within(group).getByText("Crossroads spread review")).toBeInTheDocument();
    }
  });
});
