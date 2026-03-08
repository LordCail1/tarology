import { Body, Controller, Post } from "@nestjs/common";
import type { CreateReadingResponse } from "@tarology/shared";
import { CreateReadingDto } from "./dto/create-reading.dto.js";
import { ReadingsService } from "./readings.service.js";

@Controller("v1/readings")
export class ReadingsController {
  constructor(private readonly readingsService: ReadingsService) {}

  @Post()
  createReading(@Body() payload: CreateReadingDto): CreateReadingResponse {
    return this.readingsService.createReading(payload);
  }
}

