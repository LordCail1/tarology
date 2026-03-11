import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import LoginPage from "./page";

const originalApiBaseUrl = process.env.API_BASE_URL;
const originalPublicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

describe("LoginPage", () => {
  afterEach(() => {
    process.env.API_BASE_URL = originalApiBaseUrl;
    process.env.NEXT_PUBLIC_API_BASE_URL = originalPublicApiBaseUrl;
  });

  it("renders Google sign-in URL with return path", async () => {
    process.env.API_BASE_URL = "http://internal-api:3001";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.tarology.test";

    const view = await LoginPage({
      searchParams: Promise.resolve({ returnTo: "/reading" }),
    });
    render(view);

    expect(
      screen.getByRole("link", { name: "Continue with Google" })
    ).toHaveAttribute(
      "href",
      "https://api.tarology.test/v1/auth/google/start?returnTo=%2Freading"
    );
  });

  it("sanitizes invalid return paths to /reading", async () => {
    process.env.API_BASE_URL = "http://internal-api:3001";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.tarology.test";

    const view = await LoginPage({
      searchParams: Promise.resolve({ returnTo: "https://evil.example/x" }),
    });
    render(view);

    expect(
      screen.getByRole("link", { name: "Continue with Google" })
    ).toHaveAttribute(
      "href",
      "https://api.tarology.test/v1/auth/google/start?returnTo=%2Freading"
    );
  });
});
