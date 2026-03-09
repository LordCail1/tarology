import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { AuthenticatedUser } from "@tarology/shared";

@Injectable()
export class GoogleAuthCallbackGuard extends AuthGuard("google") {
  getAuthenticateOptions() {
    return {
      session: false,
    };
  }

  handleRequest<TUser = AuthenticatedUser>(
    error: unknown,
    user: TUser,
    info: { message?: string; code?: string } | undefined
  ): TUser {
    if (error) {
      const errorWithCode = error as { code?: string };
      const code = info?.code ?? errorWithCode.code;

      if (code === "invalid_client") {
        throw new UnauthorizedException(
          "Google OAuth client credentials are invalid. Check GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET."
        );
      }

      throw new UnauthorizedException("Google authentication failed.");
    }

    if (!user) {
      throw new UnauthorizedException(info?.message ?? "Google authentication failed.");
    }

    return user;
  }
}
