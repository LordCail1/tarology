import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { ReadingsController } from "./readings.controller.js";
import { ReadingEventsRepository } from "./repositories/reading-events.repository.js";
import { ReadingIdempotencyRepository } from "./repositories/reading-idempotency.repository.js";
import { ReadingsRepository } from "./repositories/readings.repository.js";
import { ReadingSnapshotsRepository } from "./repositories/reading-snapshots.repository.js";
import { ReadingsService } from "./readings.service.js";

@Module({
  imports: [IdentityModule],
  controllers: [ReadingsController],
  providers: [
    ReadingsRepository,
    ReadingEventsRepository,
    ReadingSnapshotsRepository,
    ReadingIdempotencyRepository,
    ReadingsService,
  ],
})
export class ReadingStudioModule {}
