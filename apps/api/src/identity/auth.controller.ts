import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type {
  AuthenticatedUser,
  GetSessionResponse,
  LogoutResponse,
} from "@tarology/shared";
import { GoogleAuthCallbackGuard } from "./google-auth-callback.guard.js";
import { GoogleAuthStartGuard } from "./google-auth-start.guard.js";
import { SESSION_COOKIE_NAME } from "./identity-runtime-config.js";
import { IdentityService } from "./identity.service.js";

@Controller("v1/auth")
export class AuthController {
  constructor(
    @Inject(IdentityService)
    private readonly identityService: IdentityService
  ) {}

  @Get("google/start")
  @UseGuards(GoogleAuthStartGuard)
  startGoogleAuth(): void {
    // Passport guard handles redirect to Google OAuth.
  }

  @Get("google/callback")
  @UseGuards(GoogleAuthCallbackGuard)
  async googleCallback(@Req() request: Request, @Res() response: Response): Promise<void> {
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) {
      throw new UnauthorizedException("Google authentication failed.");
    }

    await this.identityService.saveSessionUser(request.session, user);
    const returnTo = this.identityService.consumeReturnTo(request.session);
    response.redirect(this.identityService.toWebRedirectUrl(returnTo));
  }

  @Get("session")
  getSession(@Req() request: Request): GetSessionResponse {
    const user = this.identityService.getSessionUser(request.session);
    if (!user) {
      throw new UnauthorizedException("No active session.");
    }

    return {
      authenticated: true,
      user,
    };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ): Promise<LogoutResponse> {
    response.clearCookie(SESSION_COOKIE_NAME);
    await this.identityService.destroySession(request.session);
    return { success: true };
  }
}
