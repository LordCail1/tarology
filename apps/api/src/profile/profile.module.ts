import { Module } from "@nestjs/common";
import { KnowledgeModule } from "../knowledge/knowledge.module.js";
import { PreferencesController } from "./preferences.controller.js";
import { PreferencesService } from "./preferences.service.js";
import { ProfileBootstrapService } from "./profile-bootstrap.service.js";
import { ProfileController } from "./profile.controller.js";
import { ProfileService } from "./profile.service.js";

@Module({
  imports: [KnowledgeModule],
  controllers: [ProfileController, PreferencesController],
  providers: [
    ProfileService,
    PreferencesService,
    ProfileBootstrapService,
  ],
  exports: [ProfileBootstrapService],
})
export class ProfileModule {}
