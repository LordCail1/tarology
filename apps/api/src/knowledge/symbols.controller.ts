import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type {
  CreateSymbolResponse,
  GetSymbolResponse,
  GetSymbolsResponse,
  UpdateSymbolResponse,
} from "@tarology/shared";
import { CurrentUser } from "../identity/current-user.decorator.js";
import { SessionAuthGuard } from "../identity/session-auth.guard.js";
import { DecksService } from "./decks.service.js";
import { CreateSymbolDto } from "./dto/create-symbol.dto.js";
import { ListSymbolsQueryDto } from "./dto/list-symbols-query.dto.js";
import { UpdateSymbolDto } from "./dto/update-symbol.dto.js";

@Controller("v1/symbols")
@UseGuards(SessionAuthGuard)
export class SymbolsController {
  constructor(private readonly decksService: DecksService) {}

  @Get()
  getSymbols(
    @CurrentUser() user: { userId: string },
    @Query() query: ListSymbolsQueryDto
  ): Promise<GetSymbolsResponse> {
    return this.decksService.listSymbols(user.userId, query.deckId);
  }

  @Get(":id")
  getSymbol(
    @CurrentUser() user: { userId: string },
    @Param("id") symbolRecordId: string
  ): Promise<GetSymbolResponse> {
    return this.decksService.getSymbol(user.userId, symbolRecordId);
  }

  @Post()
  createSymbol(
    @CurrentUser() user: { userId: string },
    @Body() payload: CreateSymbolDto
  ): Promise<CreateSymbolResponse> {
    return this.decksService.createSymbol(user.userId, payload);
  }

  @Patch(":id")
  updateSymbol(
    @CurrentUser() user: { userId: string },
    @Param("id") symbolRecordId: string,
    @Body() payload: UpdateSymbolDto
  ): Promise<UpdateSymbolResponse> {
    return this.decksService.updateSymbol(user.userId, symbolRecordId, payload);
  }
}
