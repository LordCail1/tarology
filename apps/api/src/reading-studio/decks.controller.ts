import { Controller, Get, UseGuards } from "@nestjs/common";
import type { GetDecksResponse } from "@tarology/shared";
import { SessionAuthGuard } from "../identity/session-auth.guard.js";
import { DeckCatalogService } from "./deck-catalog.service.js";

@Controller("v1/decks")
@UseGuards(SessionAuthGuard)
export class DecksController {
  constructor(private readonly deckCatalogService: DeckCatalogService) {}

  @Get()
  async getDecks(): Promise<GetDecksResponse> {
    return {
      decks: await this.deckCatalogService.listDecks(),
    };
  }
}
