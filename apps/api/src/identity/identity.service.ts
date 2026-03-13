import { ConflictException, Injectable } from "@nestjs/common";
import { AuthProvider } from "@prisma/client";
import type { Session } from "express-session";
import type { AuthenticatedUser } from "@tarology/shared";
import { PrismaService } from "../database/prisma.service.js";
import { ProfileBootstrapService } from "../profile/profile-bootstrap.service.js";
import { getIdentityRuntimeConfig } from "./identity-runtime-config.js";

const DEFAULT_RETURN_TO = "/reading";
const UNIQUE_CONSTRAINT_ERROR_CODE = "P2002";
const PROVISION_RETRY_LIMIT = 2;
const GOOGLE_SUBJECT_EMAIL_COLLISION_MESSAGE =
  "This Google account email is already linked to a different sign-in identity.";
type IdentitySession = Session & {
  user?: AuthenticatedUser;
  returnTo?: string;
};

function isUniqueConstraintError(
  error: unknown
): error is {
  code: string;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === UNIQUE_CONSTRAINT_ERROR_CODE
  );
}

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileBootstrapService: ProfileBootstrapService
  ) {}

  sanitizeReturnTo(returnTo: string | undefined): string {
    if (!returnTo) {
      return DEFAULT_RETURN_TO;
    }

    if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
      return DEFAULT_RETURN_TO;
    }

    return returnTo;
  }

  consumeReturnTo(session: IdentitySession | undefined): string {
    const sanitized = this.sanitizeReturnTo(session?.returnTo);
    if (session) {
      delete session.returnTo;
    }
    return sanitized;
  }

  toWebRedirectUrl(returnTo: string): string {
    const { webAppUrl } = getIdentityRuntimeConfig();
    return `${webAppUrl}${this.sanitizeReturnTo(returnTo)}`;
  }

  getSessionUser(session: IdentitySession | undefined): AuthenticatedUser | null {
    return session?.user ?? null;
  }

  async provisionAuthenticatedUser(user: AuthenticatedUser): Promise<AuthenticatedUser> {
    for (let attempt = 0; attempt < PROVISION_RETRY_LIMIT; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const existingIdentity = await tx.authIdentity.findUnique({
            where: {
              provider_providerSubject: {
                provider: AuthProvider.google,
                providerSubject: user.providerSubject,
              },
            },
          });

          let persistedUser;
          if (existingIdentity) {
            persistedUser = await tx.user.update({
              where: { id: existingIdentity.userId },
              data: { email: user.email },
            });

            await tx.authIdentity.update({
              where: { id: existingIdentity.id },
              data: {
                emailSnapshot: user.email,
                displayNameSnapshot: user.displayName,
                avatarUrlSnapshot: user.avatarUrl,
              },
            });
          } else {
            const existingEmailUser = await tx.user.findUnique({
              where: { email: user.email },
            });

            if (existingEmailUser) {
              throw new ConflictException(GOOGLE_SUBJECT_EMAIL_COLLISION_MESSAGE);
            }

            persistedUser = await tx.user.create({
              data: {
                email: user.email,
              },
            });

            await tx.authIdentity.create({
              data: {
                userId: persistedUser.id,
                provider: AuthProvider.google,
                providerSubject: user.providerSubject,
                emailSnapshot: user.email,
                displayNameSnapshot: user.displayName,
                avatarUrlSnapshot: user.avatarUrl,
              },
            });
          }

          await this.profileBootstrapService.ensureUserShell(tx, persistedUser, {
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          });

          return {
            ...user,
            userId: persistedUser.id,
          };
        });
      } catch (error) {
        // Concurrent callbacks for the same Google subject can still race before the retry
        // observes the committed auth identity.
        if (!isUniqueConstraintError(error) || attempt === PROVISION_RETRY_LIMIT - 1) {
          throw error;
        }
      }
    }

    throw new Error("Provisioning retry limit exhausted.");
  }

  async saveSessionUser(
    session: IdentitySession | undefined,
    user: AuthenticatedUser
  ): Promise<void> {
    if (!session) {
      return;
    }

    session.user = user;
    await new Promise<void>((resolve, reject) => {
      session.save((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async destroySession(session: IdentitySession | undefined): Promise<void> {
    if (!session) {
      return;
    }

    await new Promise<void>((resolve) => {
      session.destroy(() => resolve());
    });
  }
}
