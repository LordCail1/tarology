import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OnboardingPage from "./page";

vi.mock("../../components/onboarding/onboarding-gate", () => ({
  OnboardingGate: ({ returnTo }: { returnTo: string }) => (
    <div>Onboarding Gate: {returnTo}</div>
  ),
}));

describe("OnboardingPage", () => {
  it("passes a safe return path into the onboarding gate", async () => {
    const rendered = await OnboardingPage({
      searchParams: Promise.resolve({ returnTo: "/reading" }),
    });

    render(rendered);
    expect(screen.getByText("Onboarding Gate: /reading")).toBeInTheDocument();
  });

  it("falls back to /reading for invalid return paths", async () => {
    const rendered = await OnboardingPage({
      searchParams: Promise.resolve({ returnTo: "https://evil.example/next" }),
    });

    render(rendered);
    expect(screen.getByText("Onboarding Gate: /reading")).toBeInTheDocument();
  });
});
