import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("HomePage", () => {
  beforeEach(() => {
    redirectMock.mockReset();
  });

  it("redirects root requests to /reading", () => {
    HomePage();

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/reading");
  });
});
