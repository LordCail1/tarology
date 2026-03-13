import { ConflictException } from "@nestjs/common";
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

  it("rejects linking a new Google subject onto an existing email-owned account", async () => {
    const existingUser = { id: "persisted-user-email-owner", email: baseUser.email };
    const tx = {
      authIdentity: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(existingUser),
        create: vi.fn(),
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

    await expect(service.provisionAuthenticatedUser(baseUser)).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.authIdentity.create).not.toHaveBeenCalled();
    expect(bootstrap.ensureUserShell).not.toHaveBeenCalled();
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

  it("rejects email collisions when a known Google subject changes to another user's email", async () => {
    const existingIdentity = {
      id: "identity-subject-owner",
      userId: "persisted-user-1",
    };
    const otherUser = { id: "persisted-user-2", email: baseUser.email };
    const tx = {
      authIdentity: {
        findUnique: vi.fn().mockResolvedValue(existingIdentity),
        update: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(otherUser),
        create: vi.fn(),
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

    await expect(service.provisionAuthenticatedUser(baseUser)).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.authIdentity.update).not.toHaveBeenCalled();
    expect(bootstrap.ensureUserShell).not.toHaveBeenCalled();
  });

  it("retries unique-constraint races during first-login provisioning", async () => {
    const existingIdentity = {
      id: "identity-race-replay",
      userId: "persisted-user-2",
    };
    const updatedUser = { id: existingIdentity.userId, email: baseUser.email };
    const retryableRaceError = Object.assign(new Error("race"), {
      code: "P2002",
    });
    const tx = {
      authIdentity: {
        findUnique: vi.fn().mockResolvedValue(existingIdentity),
        update: vi.fn().mockResolvedValue(undefined),
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(updatedUser),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(updatedUser),
      },
    };
    const prisma = {
      $transaction: vi
        .fn()
        .mockRejectedValueOnce(retryableRaceError)
        .mockImplementationOnce(
          async (callback: (innerTx: typeof tx) => Promise<AuthenticatedUser>) => callback(tx)
        ),
    };
    const bootstrap = {
      ensureUserShell: vi.fn().mockResolvedValue(undefined),
    };
    const service = new IdentityService(prisma as never, bootstrap as never);

    const persisted = await service.provisionAuthenticatedUser(baseUser);

    expect(persisted.userId).toBe(existingIdentity.userId);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.authIdentity.update).toHaveBeenCalledOnce();
    expect(tx.authIdentity.create).not.toHaveBeenCalled();
    expect(bootstrap.ensureUserShell).toHaveBeenCalledOnce();
  });
});
