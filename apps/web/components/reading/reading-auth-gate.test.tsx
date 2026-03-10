import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReadingAuthGate } from "./reading-auth-gate";

const replaceMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("./reading-studio-shell", () => ({
  ReadingStudioShell: () => <div>Reading Studio Shell</div>,
}));

describe("ReadingAuthGate", () => {
  const originalPublicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.tarology.test";
    replaceMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalPublicApiBaseUrl;
    vi.unstubAllGlobals();
  });

  it("renders the studio after a successful browser session check", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        authenticated: true,
        user: {
          userId: "google:123",
          provider: "google",
          providerSubject: "123",
          email: "reader@example.com",
          displayName: "Reader",
          avatarUrl: null,
        },
      }),
    });

    render(<ReadingAuthGate />);

    await waitFor(() => expect(screen.getByText("Reading Studio Shell")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("https://api.tarology.test/v1/auth/session", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to the login page", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
    });

    render(<ReadingAuthGate />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/login?returnTo=%2Freading")
    );
    expect(screen.getByText("Checking session")).toBeInTheDocument();
  });
});
