import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeckManagementGate } from "./deck-management-gate";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn(),
}));
const fetchMock = vi.fn();
const shellMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("./deck-management-shell", () => ({
  DeckManagementShell: (props: unknown) => {
    shellMock(props);
    return <div>Deck Management Shell</div>;
  },
}));

describe("DeckManagementGate", () => {
  const originalPublicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.tarology.test";
    routerMock.replace.mockReset();
    fetchMock.mockReset();
    shellMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalPublicApiBaseUrl;
    vi.unstubAllGlobals();
  });

  it("renders the deck-management shell for authenticated users with a default deck", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          authenticated: true,
          user: {
            userId: "usr_123",
            provider: "google",
            providerSubject: "123",
            email: "reader@example.com",
            displayName: "Reader",
            avatarUrl: null,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          profile: {
            userId: "usr_123",
            email: "reader@example.com",
            displayName: "Reader Example",
            avatarUrl: null,
            provider: "google",
            createdAt: "2026-03-11T10:00:00.000Z",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          preferences: {
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
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          decks: [
            {
              id: "thoth",
              name: "Thoth Tarot",
              description: "Starter deck",
              specVersion: "thoth-v1",
              previewImageUrl: "/images/cards/thoth/TheSun.jpg",
              backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
              cardCount: 78,
            },
          ],
        }),
      });

    render(<DeckManagementGate />);

    await waitFor(() =>
      expect(screen.getByText("Deck Management Shell")).toBeInTheDocument()
    );
    expect(shellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({ displayName: "Reader Example" }),
        preferences: expect.objectContaining({ defaultDeckId: "thoth" }),
        availableDecks: expect.arrayContaining([
          expect.objectContaining({ id: "thoth" }),
        ]),
      })
    );
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to login", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
    });

    render(<DeckManagementGate />);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/login?returnTo=%2Fdecks")
    );
  });

  it("redirects users without a default deck to onboarding", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          authenticated: true,
          user: {
            userId: "usr_123",
            provider: "google",
            providerSubject: "123",
            email: "reader@example.com",
            displayName: "Reader",
            avatarUrl: null,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          profile: {
            userId: "usr_123",
            email: "reader@example.com",
            displayName: "Reader Example",
            avatarUrl: null,
            provider: "google",
            createdAt: "2026-03-11T10:00:00.000Z",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          preferences: {
            defaultDeckId: null,
            defaultDeck: null,
            onboardingComplete: false,
            updatedAt: "2026-03-11T10:05:00.000Z",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          decks: [],
        }),
      });

    render(<DeckManagementGate />);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/onboarding?returnTo=%2Fdecks")
    );
  });

  it("retries once after a transient deck gate bootstrap failure", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          authenticated: true,
          user: {
            userId: "usr_123",
            provider: "google",
            providerSubject: "123",
            email: "reader@example.com",
            displayName: "Reader",
            avatarUrl: null,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          profile: {
            userId: "usr_123",
            email: "reader@example.com",
            displayName: "Reader Example",
            avatarUrl: null,
            provider: "google",
            createdAt: "2026-03-11T10:00:00.000Z",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          preferences: {
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
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          decks: [
            {
              id: "thoth",
              name: "Thoth Tarot",
              description: "Starter deck",
              specVersion: "thoth-v1",
              previewImageUrl: "/images/cards/thoth/TheSun.jpg",
              backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
              cardCount: 78,
            },
          ],
        }),
      });

    render(<DeckManagementGate />);

    await waitFor(() =>
      expect(screen.getByText("Deck Management Shell")).toBeInTheDocument()
    );
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
