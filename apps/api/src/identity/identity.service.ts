import { Injectable } from "@nestjs/common";
import type { Session } from "express-session";
import type { AuthenticatedUser } from "@tarology/shared";
import { getIdentityRuntimeConfig } from "./identity-runtime-config.js";

const DEFAULT_RETURN_TO = "/reading";
type IdentitySession = Session & {
  user?: AuthenticatedUser;
  returnTo?: string;
};

@Injectable()
export class IdentityService {
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
