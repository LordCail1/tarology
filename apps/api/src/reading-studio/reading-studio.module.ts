import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { ReadingsController } from "./readings.controller.js";
import { ReadingsService } from "./readings.service.js";

@Module({
  imports: [IdentityModule],
  controllers: [ReadingsController],
  providers: [ReadingsService],
})
export class ReadingStudioModule {}
