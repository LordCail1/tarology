import { Controller, Get, UseGuards } from "@nestjs/common";
import type { GetProfileResponse } from "@tarology/shared";
import { CurrentUser } from "../identity/current-user.decorator.js";
import { SessionAuthGuard } from "../identity/session-auth.guard.js";
import { ProfileService } from "./profile.service.js";

@Controller("v1/profile")
@UseGuards(SessionAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: { userId: string }): Promise<GetProfileResponse> {
    return this.profileService.getProfile(user.userId);
  }
}
