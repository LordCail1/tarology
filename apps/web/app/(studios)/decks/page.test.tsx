import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DeckManagementPage from "./page";

vi.mock("../../../components/decks/deck-management-gate", () => ({
  DeckManagementGate: () => <div>Deck Management Gate</div>,
}));

describe("DeckManagementPage", () => {
  it("renders the deck-management gate", () => {
    render(<DeckManagementPage />);

    expect(screen.getByText("Deck Management Gate")).toBeInTheDocument();
  });
});
