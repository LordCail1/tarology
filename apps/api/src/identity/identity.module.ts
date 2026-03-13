import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller.js";
import { GoogleAuthCallbackGuard } from "./google-auth-callback.guard.js";
import { GoogleAuthStartGuard } from "./google-auth-start.guard.js";
import { GoogleStrategy } from "./google.strategy.js";
import { IdentityService } from "./identity.service.js";
import { SessionAuthGuard } from "./session-auth.guard.js";
import { ProfileModule } from "../profile/profile.module.js";

@Module({
  imports: [PassportModule.register({ session: false }), ProfileModule],
  controllers: [AuthController],
  providers: [
    IdentityService,
    GoogleStrategy,
    GoogleAuthStartGuard,
    GoogleAuthCallbackGuard,
    SessionAuthGuard,
  ],
  exports: [SessionAuthGuard],
})
export class IdentityModule {}
