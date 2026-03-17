import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReadingAuthGate } from "./reading-auth-gate";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn(),
}));
const fetchMock = vi.fn();
const shellMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("./reading-studio-shell", () => ({
  ReadingStudioShell: (props: unknown) => {
    shellMock(props);
    return <div>Reading Studio Shell</div>;
  },
}));

describe("ReadingAuthGate", () => {
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

  it("renders the studio after a successful browser session check", async () => {
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
      });

    render(<ReadingAuthGate />);

    await waitFor(() => expect(screen.getByText("Reading Studio Shell")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.tarology.test/v1/auth/session",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.tarology.test/v1/profile",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.tarology.test/v1/preferences",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })
    );
    expect(shellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({ displayName: "Reader Example" }),
        preferences: expect.objectContaining({ defaultDeckId: "thoth" }),
      })
    );
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to the login page", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
    });

    render(<ReadingAuthGate />);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/login?returnTo=%2Freading")
    );
    expect(screen.getByText("Checking session")).toBeInTheDocument();
  });

  it("redirects authenticated users without a default deck to onboarding", async () => {
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
      });

    render(<ReadingAuthGate />);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/onboarding?returnTo=%2Freading")
    );
  });

  it("shows a retryable blocking state when preferences fail for a non-auth reason", async () => {
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
        ok: false,
        status: 500,
        json: async () => ({ message: "Internal error" }),
      });

    render(<ReadingAuthGate />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Unable to load workspace" })).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("retries once after a transient session bootstrap failure", async () => {
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
      });

    render(<ReadingAuthGate />);

    await waitFor(() => expect(screen.getByText("Reading Studio Shell")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("does not attach timeout abort signals to later non-gate reading mutations", async () => {
    fetchMock.mockResolvedValue({
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
    });

    const { patchPreferences } = await import("../../lib/client-api");
    await patchPreferences({ defaultDeckId: "thoth" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.tarology.test/v1/preferences",
      expect.not.objectContaining({
        signal: expect.anything(),
      })
    );
  });
});
