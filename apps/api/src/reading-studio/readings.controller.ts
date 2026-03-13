import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type {
  AuthenticatedUser,
  CreateReadingResponse,
  GetReadingResponse,
  ListReadingsResponse,
  ReadingCommandResponse,
} from "@tarology/shared";
import { CurrentUser } from "../identity/current-user.decorator.js";
import { SessionAuthGuard } from "../identity/session-auth.guard.js";
import { CreateReadingDto } from "./dto/create-reading.dto.js";
import { ListReadingsQueryDto } from "./dto/list-readings-query.dto.js";
import { ReadingCommandDto } from "./dto/reading-command.dto.js";
import { ReadingsService } from "./readings.service.js";

function requireIdempotencyKey(value: string | undefined): string {
  const idempotencyKey = value?.trim();
  if (!idempotencyKey) {
    throw new BadRequestException("Idempotency-Key header is required.");
  }

  return idempotencyKey;
}

@Controller("v1/readings")
@UseGuards(SessionAuthGuard)
export class ReadingsController {
  constructor(
    @Inject(ReadingsService)
    private readonly readingsService: ReadingsService
  ) {}

  @Post()
  async createReading(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateReadingDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: Response
  ): Promise<CreateReadingResponse> {
    const result = await this.readingsService.createReading(
      user,
      payload,
      requireIdempotencyKey(idempotencyKey)
    );

    response.status(result.created ? 201 : 200);
    return result.response;
  }

  @Get()
  listReadings(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListReadingsQueryDto
  ): Promise<ListReadingsResponse> {
    return this.readingsService.listReadings(user, query.status);
  }

  @Get(":id")
  getReading(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) readingId: string
  ): Promise<GetReadingResponse> {
    return this.readingsService.getReading(user, readingId);
  }

  @Post(":id/commands")
  @HttpCode(200)
  applyCommand(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) readingId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() payload: ReadingCommandDto
  ): Promise<ReadingCommandResponse> {
    return this.readingsService.applyCommand(
      user,
      readingId,
      requireIdempotencyKey(idempotencyKey),
      payload
    );
  }
}
