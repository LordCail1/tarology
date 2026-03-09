import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReadingStudioPage from "./page";

const redirectMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("../../../lib/get-session", () => ({
  getSession: getSessionMock,
}));

vi.mock("../../../components/reading/reading-studio-shell", () => ({
  ReadingStudioShell: () => <div>Reading Studio Shell</div>,
}));

describe("ReadingStudioPage auth gate", () => {
  beforeEach(() => {
    redirectMock.mockReset();
    getSessionMock.mockReset();
  });

  it("redirects to login when no valid session is present", async () => {
    getSessionMock.mockResolvedValue(null);

    await ReadingStudioPage();

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/login?returnTo=%2Freading");
  });

  it("renders the studio shell for authenticated sessions", async () => {
    getSessionMock.mockResolvedValue({
      authenticated: true,
      user: {
        userId: "google:123",
        provider: "google",
        providerSubject: "123",
        email: "reader@example.com",
        displayName: "Reader",
        avatarUrl: null,
      },
    });

    const rendered = await ReadingStudioPage();
    render(rendered);

    expect(screen.getByText("Reading Studio Shell")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
