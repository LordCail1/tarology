import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DeckManagementShell } from "./deck-management-shell";

const profile = {
  userId: "usr_123",
  email: "reader@example.com",
  displayName: "Reader Example",
  avatarUrl: null,
  provider: "google" as const,
  createdAt: "2026-03-11T10:00:00.000Z",
};

const preferences = {
  defaultDeckId: "thoth",
  defaultDeck: {
    id: "thoth",
    name: "Thoth Tarot",
    description: "Starter deck",
    specVersion: "thoth-v1",
    previewImageUrl: "/images/cards/thoth/TheSun.jpg",
    backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
    cardCount: 78,
  },
  onboardingComplete: true,
  updatedAt: "2026-03-11T10:05:00.000Z",
};

const availableDecks = [preferences.defaultDeck];

describe("DeckManagementShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders the starter deck and lets the user add a new symbol from the library", async () => {
    render(
      <DeckManagementShell
        profile={profile}
        preferences={preferences}
        availableDecks={availableDecks}
      />
    );

    await waitFor(() => expect(screen.getAllByText("Thoth Tarot").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: "Symbols" }));

    fireEvent.change(screen.getByPlaceholderText("Symbol name"), {
      target: { value: "Hourglass" },
    });
    fireEvent.change(screen.getByPlaceholderText("Short description"), {
      target: { value: "Time pressure and pacing." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Symbol" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Hourglass" })).toBeInTheDocument()
    );
    expect(screen.getByText("Symbol created.")).toBeInTheDocument();
  });
});
