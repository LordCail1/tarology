import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module.js";
import { IdentityModule } from "./identity/identity.module.js";
import { ProfileModule } from "./profile/profile.module.js";
import { ProviderConnectionsModule } from "./provider-connections/provider-connections.module.js";
import { ReadingStudioModule } from "./reading-studio/reading-studio.module.js";

@Module({
  imports: [
    DatabaseModule,
    IdentityModule,
    ProfileModule,
    ProviderConnectionsModule,
    ReadingStudioModule,
  ],
})
export class AppModule {}
