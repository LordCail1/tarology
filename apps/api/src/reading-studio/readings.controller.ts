import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import type { CreateReadingResponse } from "@tarology/shared";
import { SessionAuthGuard } from "../identity/session-auth.guard.js";
import { CreateReadingDto } from "./dto/create-reading.dto.js";
import { ReadingsService } from "./readings.service.js";

@Controller("v1/readings")
@UseGuards(SessionAuthGuard)
export class ReadingsController {
  constructor(private readonly readingsService: ReadingsService) {}

  @Post()
  createReading(@Body() payload: CreateReadingDto): CreateReadingResponse {
    return this.readingsService.createReading(payload);
  }
}
