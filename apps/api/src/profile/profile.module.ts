import { Module } from "@nestjs/common";
import { PreferencesController } from "./preferences.controller.js";
import { PreferencesService } from "./preferences.service.js";
import { ProfileBootstrapService } from "./profile-bootstrap.service.js";
import { ProfileController } from "./profile.controller.js";
import { ProfileService } from "./profile.service.js";

@Module({
  controllers: [ProfileController, PreferencesController],
  providers: [
    ProfileService,
    PreferencesService,
    ProfileBootstrapService,
  ],
  exports: [ProfileBootstrapService],
})
export class ProfileModule {}
