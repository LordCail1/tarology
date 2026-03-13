import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingGate } from "./onboarding-gate";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn(),
}));
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

describe("OnboardingGate", () => {
  const originalPublicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.tarology.test";
    routerMock.replace.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalPublicApiBaseUrl;
    vi.unstubAllGlobals();
  });

  it("redirects unauthenticated users to login", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    render(<OnboardingGate returnTo="/reading" />);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/login?returnTo=%2Fonboarding")
    );
  });

  it("redirects away when onboarding is already complete", async () => {
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

    render(<OnboardingGate returnTo="/reading" />);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/reading"));
  });

  it("saves the default deck and redirects to returnTo", async () => {
    fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith("/v1/auth/session")) {
        return {
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
        };
      }

      if (url.endsWith("/v1/preferences") && init?.method === "PATCH") {
        return {
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
              updatedAt: "2026-03-11T10:10:00.000Z",
            },
          }),
        };
      }

      if (url.endsWith("/v1/preferences")) {
        return {
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
        };
      }

      if (url.endsWith("/v1/decks")) {
        return {
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
        };
      }

      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    render(<OnboardingGate returnTo="/reading" />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue with Thoth" })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue with Thoth" }));

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/reading"));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.tarology.test/v1/preferences",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ defaultDeckId: "thoth" }),
      })
    );
  });

  it("shows a retryable blocking state when deck loading fails", async () => {
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
          preferences: {
            defaultDeckId: null,
            defaultDeck: null,
            onboardingComplete: false,
            updatedAt: "2026-03-11T10:05:00.000Z",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: "Deck catalog unavailable" }),
      });

    render(<OnboardingGate returnTo="/reading" />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Unable to load onboarding" })
      ).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
