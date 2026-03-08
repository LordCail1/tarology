import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReadingStudioShell } from "./reading-studio-shell";

describe("ReadingStudioShell", () => {
  it("renders left, center, and right panel headings", () => {
    render(<ReadingStudioShell />);

    expect(screen.getByRole("heading", { name: "Reading History" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Card Fan and Canvas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Question Threads" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Interpretation History" })).toBeInTheDocument();
  });

  it("switches active mobile tab state when users change panels", () => {
    render(<ReadingStudioShell />);

    const canvasTab = screen.getByRole("tab", { name: "Canvas" });
    const historyTab = screen.getByRole("tab", { name: "History" });
    const threadsTab = screen.getByRole("tab", { name: "Threads" });

    expect(canvasTab).toHaveAttribute("aria-selected", "true");
    expect(historyTab).toHaveAttribute("aria-selected", "false");

    fireEvent.click(historyTab);
    expect(historyTab).toHaveAttribute("aria-selected", "true");
    expect(canvasTab).toHaveAttribute("aria-selected", "false");

    fireEvent.click(threadsTab);
    expect(threadsTab).toHaveAttribute("aria-selected", "true");
    expect(historyTab).toHaveAttribute("aria-selected", "false");
  });

  it("filters reading history with search and status controls", () => {
    render(<ReadingStudioShell />);

    const searchInput = screen.getByLabelText("Search readings");
    fireEvent.change(searchInput, { target: { value: "Creative" } });

    expect(screen.getByText("Creative project momentum")).toBeInTheDocument();
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
