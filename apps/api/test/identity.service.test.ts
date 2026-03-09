import { describe, expect, it } from "vitest";
import { IdentityService } from "../src/identity/identity.service.js";

describe("IdentityService", () => {
  const service = new IdentityService();

  it("keeps safe relative return paths", () => {
    expect(service.sanitizeReturnTo("/reading")).toBe("/reading");
    expect(service.sanitizeReturnTo("/reading?tab=threads")).toBe(
      "/reading?tab=threads"
    );
  });

  it("rejects absolute and protocol-relative return paths", () => {
    expect(service.sanitizeReturnTo("https://example.com/pwned")).toBe("/reading");
    expect(service.sanitizeReturnTo("//example.com/pwned")).toBe("/reading");
    expect(service.sanitizeReturnTo("relative/path")).toBe("/reading");
    expect(service.sanitizeReturnTo(undefined)).toBe("/reading");
  });
});
