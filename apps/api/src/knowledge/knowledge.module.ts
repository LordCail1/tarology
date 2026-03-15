import { Module } from "@nestjs/common";
import { SessionAuthGuard } from "../identity/session-auth.guard.js";
import { CardsController } from "./cards.controller.js";
import { DecksController } from "./decks.controller.js";
import { DecksService } from "./decks.service.js";
import { StarterDeckTemplatesService } from "./starter-deck-templates.service.js";
import { SymbolsController } from "./symbols.controller.js";

@Module({
  controllers: [DecksController, CardsController, SymbolsController],
  providers: [SessionAuthGuard, StarterDeckTemplatesService, DecksService],
  exports: [StarterDeckTemplatesService, DecksService],
})
export class KnowledgeModule {}
