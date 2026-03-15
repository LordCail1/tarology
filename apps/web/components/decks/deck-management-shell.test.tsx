import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildDeckLibraryStorageKey } from "../../lib/deck-management-data-source";
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

  it("creates unique source ids when the reader adds duplicate-titled sources", async () => {
    render(
      <DeckManagementShell
        profile={profile}
        preferences={preferences}
        availableDecks={availableDecks}
      />
    );

    await waitFor(() => expect(screen.getAllByText("Thoth Tarot").length).toBeGreaterThan(0));

    fireEvent.change(screen.getByPlaceholderText("Source title"), {
      target: { value: "Golden Dawn Notes" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Source" }));

    await waitFor(() => expect(screen.getByText("Source added.")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Source title"), {
      target: { value: "Golden Dawn Notes" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Source" }));

    await waitFor(() => {
      const rawSnapshot = window.localStorage.getItem(buildDeckLibraryStorageKey(profile.userId));
      expect(rawSnapshot).toBeTruthy();

      const snapshot = JSON.parse(rawSnapshot!);
      const deck = snapshot.decks.find((candidate: { id: string }) => candidate.id === snapshot.activeDeckId);
      const duplicateSources = deck.knowledgeSources.filter(
        (source: { title: string }) => source.title === "Golden Dawn Notes"
      );

      expect(duplicateSources).toHaveLength(2);
      expect(duplicateSources[0].sourceId).not.toBe(duplicateSources[1].sourceId);
    });
  });

  it("shows a recoverable empty-library state instead of an infinite loader", async () => {
    render(
      <DeckManagementShell
        profile={profile}
        preferences={preferences}
        availableDecks={[]}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "No deck library available" })).toBeInTheDocument()
    );
    expect(
      screen.queryByRole("heading", { name: "Preparing deck surface" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Reading" })).toBeInTheDocument();
  });

  it("refuses to save an entry edit after the reader switches to a different subject", async () => {
    render(
      <DeckManagementShell
        profile={profile}
        preferences={preferences}
        availableDecks={availableDecks}
      />
    );

    await waitFor(() => expect(screen.getAllByText("Thoth Tarot").length).toBeGreaterThan(0));
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Edit" }).length).toBeGreaterThan(0)
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    fireEvent.change(screen.getByPlaceholderText("Write the layered knowledge entry here"), {
      target: { value: "Cross-subject edit attempt" },
    });

    fireEvent.click(screen.getByRole("button", { name: /The Magician/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(
        screen.getByText("Editing context changed. Start a new entry for the current selection.")
      ).toBeInTheDocument()
    );

    expect(screen.queryByText("Cross-subject edit attempt")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /The Fool/ }));

    expect(
      screen.getByText(/The Fool is loaded here as starter-content mock knowledge\./)
    ).toBeInTheDocument();
  });

  it("rejects duplicate symbol creation without bumping persisted knowledge version", async () => {
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

    const rawSnapshot = window.localStorage.getItem(buildDeckLibraryStorageKey(profile.userId));
    expect(rawSnapshot).toBeTruthy();
    const snapshotAfterFirstCreate = JSON.parse(rawSnapshot!);
    const deckAfterFirstCreate = snapshotAfterFirstCreate.decks.find(
      (candidate: { id: string }) => candidate.id === snapshotAfterFirstCreate.activeDeckId
    );
    const knowledgeVersionAfterFirstCreate = deckAfterFirstCreate.knowledgeVersion;
    const symbolCountAfterFirstCreate = deckAfterFirstCreate.symbolCount;

    fireEvent.change(screen.getByPlaceholderText("Symbol name"), {
      target: { value: "Hourglass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Symbol" }));

    await waitFor(() =>
      expect(screen.getByText("Symbol already exists in this deck.")).toBeInTheDocument()
    );
    expect(screen.queryByText("Symbol created.")).not.toBeInTheDocument();

    const rawSnapshotAfterDuplicate = window.localStorage.getItem(
      buildDeckLibraryStorageKey(profile.userId)
    );
    const snapshotAfterDuplicate = JSON.parse(rawSnapshotAfterDuplicate!);
    const deckAfterDuplicate = snapshotAfterDuplicate.decks.find(
      (candidate: { id: string }) => candidate.id === snapshotAfterDuplicate.activeDeckId
    );

    expect(deckAfterDuplicate.knowledgeVersion).toBe(knowledgeVersionAfterFirstCreate);
    expect(deckAfterDuplicate.symbolCount).toBe(symbolCountAfterFirstCreate);
  });
});
