import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import type { GetCardResponse, UpdateCardResponse } from "@tarology/shared";
import { CurrentUser } from "../identity/current-user.decorator.js";
import { SessionAuthGuard } from "../identity/session-auth.guard.js";
import { DecksService } from "./decks.service.js";
import { UpdateCardDto } from "./dto/update-card.dto.js";

@Controller("v1/cards")
@UseGuards(SessionAuthGuard)
export class CardsController {
  constructor(private readonly decksService: DecksService) {}

  @Get(":id")
  getCard(
    @CurrentUser() user: { userId: string },
    @Param("id") cardRecordId: string
  ): Promise<GetCardResponse> {
    return this.decksService.getCard(user.userId, cardRecordId);
  }

  @Patch(":id")
  updateCard(
    @CurrentUser() user: { userId: string },
    @Param("id") cardRecordId: string,
    @Body() payload: UpdateCardDto
  ): Promise<UpdateCardResponse> {
    return this.decksService.updateCard(user.userId, cardRecordId, payload);
  }
}
