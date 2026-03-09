import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ReadingStudioShell } from "./reading-studio-shell";

describe("ReadingStudioShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders minimal shell headings with logo watermark and composer", () => {
    render(<ReadingStudioShell />);

    expect(screen.getByRole("heading", { name: "Reading History" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Card Fan and Canvas" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand right sidebar" }));
    expect(screen.getByRole("heading", { name: "Question Threads" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Interpretation History" })).toBeInTheDocument();
    expect(screen.getByAltText("Tarot-logy logo watermark")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Ask a question or start a new reading...")
    ).toBeInTheDocument();
    expect(screen.queryByText("Face-down fan")).not.toBeInTheDocument();
  });

  it("uses desktop first-visit defaults of left expanded and right collapsed", () => {
    render(<ReadingStudioShell />);

    const leftToggle = screen.getByRole("button", { name: "Collapse left sidebar" });
    const rightToggle = screen.getByRole("button", { name: "Expand right sidebar" });

    expect(leftToggle).toHaveAttribute("aria-expanded", "true");
    expect(rightToggle).toHaveAttribute("aria-expanded", "false");
  });

  it("restores persisted sidebar state from localStorage", async () => {
    window.localStorage.setItem("tarology.ui.leftPanelOpen", "false");
    window.localStorage.setItem("tarology.ui.rightPanelOpen", "true");

    render(<ReadingStudioShell />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Expand left sidebar",
        })
      ).toHaveAttribute("aria-expanded", "false")
    );
    expect(
      screen.getByRole("button", { name: "Collapse right sidebar" })
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles both sidebars and persists the new state", async () => {
    render(<ReadingStudioShell />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse left sidebar" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Expand left sidebar" })).toBeInTheDocument()
    );
    expect(window.localStorage.getItem("tarology.ui.leftPanelOpen")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Expand right sidebar" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Collapse right sidebar" })).toBeInTheDocument()
    );
    expect(window.localStorage.getItem("tarology.ui.rightPanelOpen")).toBe("true");
  });

  it("supports drawer close through backdrop click and Escape", async () => {
    render(<ReadingStudioShell />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse left sidebar" }));

    fireEvent.click(screen.getByRole("button", { name: "Open right panel" }));
    expect(
      screen.getByRole("button", { name: "Close right sidebar backdrop" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close right sidebar backdrop" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Close right sidebar backdrop" })
      ).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Open right panel" }));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Close right sidebar backdrop" })
      ).not.toBeInTheDocument()
    );
  });

  it("filters reading history with search and status controls", () => {
    render(<ReadingStudioShell />);

    const searchInput = screen.getByLabelText("Search readings");
    fireEvent.change(searchInput, { target: { value: "Creative" } });

    expect(screen.getByText("Creative project momentum sprint")).toBeInTheDocument();
    expect(screen.queryByText("Career realignment and confidence")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Paused/i }));
    expect(screen.getByText("No readings match current filters.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /All/i }));
    fireEvent.change(searchInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Complete/i }));

    expect(screen.getByText("Spring direction spread")).toBeInTheDocument();
    expect(screen.queryByText("Relationship clarity check-in")).not.toBeInTheDocument();
  });
});
