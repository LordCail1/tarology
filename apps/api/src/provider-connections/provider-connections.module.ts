import { Module } from "@nestjs/common";
import { ProviderConnectionsController } from "./provider-connections.controller.js";
import { ProviderConnectionsService } from "./provider-connections.service.js";
import { ProviderSecretsService } from "./provider-secrets.service.js";

@Module({
  controllers: [ProviderConnectionsController],
  providers: [ProviderConnectionsService, ProviderSecretsService],
})
export class ProviderConnectionsModule {}
