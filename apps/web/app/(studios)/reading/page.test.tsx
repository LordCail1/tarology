import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReadingStudioPage from "./page";

vi.mock("../../../components/reading/reading-auth-gate", () => ({
  ReadingAuthGate: () => <div>Reading Auth Gate</div>,
}));

describe("ReadingStudioPage auth gate", () => {
  it("renders the browser-side auth gate", async () => {
    const rendered = await ReadingStudioPage();
    render(rendered);

    expect(screen.getByText("Reading Auth Gate")).toBeInTheDocument();
  });
});
