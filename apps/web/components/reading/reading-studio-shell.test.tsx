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
});
