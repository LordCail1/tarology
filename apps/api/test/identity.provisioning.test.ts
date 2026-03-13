import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@tarology/shared";
import { IdentityService } from "../src/identity/identity.service.js";

const baseUser: AuthenticatedUser = {
  userId: "google:placeholder",
  provider: "google",
  providerSubject: "google-sub-123",
  email: "reader@example.com",
  displayName: "Tarot Reader",
  avatarUrl: "https://example.com/avatar.png",
};

describe("IdentityService provisioning", () => {
  it("creates a persisted user and auth identity on first login", async () => {
    const createdUser = { id: "8cb7db53-bb07-49b8-96c1-b2a4bc2e2d2f", email: baseUser.email };
    const tx = {
      authIdentity: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        create: vi.fn().mockResolvedValue(undefined),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdUser),
        update: vi.fn(),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (innerTx: typeof tx) => Promise<AuthenticatedUser>) =>
        callback(tx)
      ),
    };
    const bootstrap = {
      ensureUserShell: vi.fn().mockResolvedValue(undefined),
    };
    const service = new IdentityService(prisma as never, bootstrap as never);

    const persisted = await service.provisionAuthenticatedUser(baseUser);

    expect(persisted.userId).toBe(createdUser.id);
    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        email: baseUser.email,
      },
    });
    expect(tx.authIdentity.create).toHaveBeenCalledOnce();
    expect(bootstrap.ensureUserShell).toHaveBeenCalledOnce();
  });

  it("reuses an existing auth identity and updates snapshots on repeat login", async () => {
    const existingIdentity = {
      id: "identity-1",
      userId: "persisted-user-1",
    };
    const updatedUser = { id: existingIdentity.userId, email: baseUser.email };
    const tx = {
      authIdentity: {
        findUnique: vi.fn().mockResolvedValue(existingIdentity),
        update: vi.fn().mockResolvedValue(undefined),
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(updatedUser),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (innerTx: typeof tx) => Promise<AuthenticatedUser>) =>
        callback(tx)
      ),
    };
    const bootstrap = {
      ensureUserShell: vi.fn().mockResolvedValue(undefined),
    };
    const service = new IdentityService(prisma as never, bootstrap as never);

    const persisted = await service.provisionAuthenticatedUser(baseUser);

    expect(persisted.userId).toBe(existingIdentity.userId);
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.authIdentity.create).not.toHaveBeenCalled();
    expect(tx.authIdentity.update).toHaveBeenCalledWith({
      where: { id: existingIdentity.id },
      data: {
        emailSnapshot: baseUser.email,
        displayNameSnapshot: baseUser.displayName,
        avatarUrlSnapshot: baseUser.avatarUrl,
      },
    });
  });
});
