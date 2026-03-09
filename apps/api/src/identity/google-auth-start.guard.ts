import { ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { IdentityService } from "./identity.service.js";

@Injectable()
export class GoogleAuthStartGuard extends AuthGuard("google") {
  constructor(
    @Inject(IdentityService)
    private readonly identityService: IdentityService
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const returnToQuery = request.query.returnTo;
    const returnTo =
      typeof returnToQuery === "string"
        ? this.identityService.sanitizeReturnTo(returnToQuery)
        : this.identityService.sanitizeReturnTo(undefined);
    if (request.session) {
      request.session.returnTo = returnTo;
    }

    const activationResult = await super.canActivate(context);
    return Boolean(activationResult);
  }

  getAuthenticateOptions() {
    return {
      scope: ["openid", "profile", "email"],
      session: false,
    };
  }
}
