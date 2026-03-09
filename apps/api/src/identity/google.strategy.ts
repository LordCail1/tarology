import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import {
  Strategy,
  type Profile as GoogleProfile,
} from "passport-google-oauth20";
import type { AuthenticatedUser } from "@tarology/shared";
import { getIdentityRuntimeConfig } from "./identity-runtime-config.js";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    const config = getIdentityRuntimeConfig();
    super({
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: config.googleCallbackUrl,
      scope: ["openid", "profile", "email"],
      state: true,
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile
  ): AuthenticatedUser {
    const providerSubject = profile.id;
    const email = profile.emails?.[0]?.value;

    if (!providerSubject || !email) {
      throw new UnauthorizedException("Google profile is missing required identity fields.");
    }

    return {
      userId: `google:${providerSubject}`,
      provider: "google",
      providerSubject,
      email,
      displayName: profile.displayName || email,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
  }
}
