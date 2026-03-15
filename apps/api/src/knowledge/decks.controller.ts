import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type {
  CreateDeckResponse,
  ExportDeckResponse,
  GetDeckResponse,
  GetDecksResponse,
  ImportDeckRequest,
  ImportDeckResponse,
  UpdateDeckResponse,
} from "@tarology/shared";
import { CurrentUser } from "../identity/current-user.decorator.js";
import { SessionAuthGuard } from "../identity/session-auth.guard.js";
import { CreateDeckDto } from "./dto/create-deck.dto.js";
import { UpdateDeckDto } from "./dto/update-deck.dto.js";
import { DecksService } from "./decks.service.js";

@Controller("v1/decks")
@UseGuards(SessionAuthGuard)
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Get()
  getDecks(@CurrentUser() user: { userId: string }): Promise<GetDecksResponse> {
    return this.decksService.listDecks(user.userId);
  }

  @Post()
  createDeck(
    @CurrentUser() user: { userId: string },
    @Body() payload: CreateDeckDto
  ): Promise<CreateDeckResponse> {
    return this.decksService.createDeck(user.userId, payload);
  }

  @Post("import")
  importDeck(
    @CurrentUser() user: { userId: string },
    @Body() payload: ImportDeckRequest
  ): Promise<ImportDeckResponse> {
    return this.decksService.importDeck(user.userId, payload);
  }

  @Get(":id")
  getDeck(
    @CurrentUser() user: { userId: string },
    @Param("id") deckId: string
  ): Promise<GetDeckResponse> {
    return this.decksService.getDeck(user.userId, deckId);
  }

  @Patch(":id")
  updateDeck(
    @CurrentUser() user: { userId: string },
    @Param("id") deckId: string,
    @Body() payload: UpdateDeckDto
  ): Promise<UpdateDeckResponse> {
    return this.decksService.updateDeck(user.userId, deckId, payload);
  }

  @Post(":id/export")
  exportDeck(
    @CurrentUser() user: { userId: string },
    @Param("id") deckId: string
  ): Promise<ExportDeckResponse> {
    return this.decksService.exportDeck(user.userId, deckId);
  }
}
