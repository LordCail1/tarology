import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import type { GetPreferencesResponse } from "@tarology/shared";
import { CurrentUser } from "../identity/current-user.decorator.js";
import { SessionAuthGuard } from "../identity/session-auth.guard.js";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto.js";
import { PreferencesService } from "./preferences.service.js";

@Controller("v1/preferences")
@UseGuards(SessionAuthGuard)
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  getPreferences(@CurrentUser() user: { userId: string }): Promise<GetPreferencesResponse> {
    return this.preferencesService.getPreferences(user.userId);
  }

  @Patch()
  updatePreferences(
    @CurrentUser() user: { userId: string },
    @Body() payload: UpdatePreferencesDto
  ): Promise<GetPreferencesResponse> {
    return this.preferencesService.updateDefaultDeck(user.userId, payload.defaultDeckId);
  }
}
