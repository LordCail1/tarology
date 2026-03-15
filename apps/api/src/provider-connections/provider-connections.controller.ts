import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type {
  DeleteProviderConnectionResponse,
  GetProviderConnectionsResponse,
  ProviderConnectionMutationResponse,
  StartProviderAccountConnectionResponse,
} from "@tarology/shared";
import type { Request } from "express";
import { CurrentUser } from "../identity/current-user.decorator.js";
import { SessionAuthGuard } from "../identity/session-auth.guard.js";
import { CompleteProviderAccountConnectionDto } from "./dto/complete-provider-account-connection.dto.js";
import { CreateApiKeyProviderConnectionDto } from "./dto/create-api-key-provider-connection.dto.js";
import { StartProviderAccountConnectionDto } from "./dto/start-provider-account-connection.dto.js";
import { UpdateProviderConnectionDto } from "./dto/update-provider-connection.dto.js";
import {
  type ProviderAccountChallengeSession,
  ProviderConnectionsService,
} from "./provider-connections.service.js";

type ProviderAccountSessionRequest = Request & {
  session: Request["session"] & {
    providerAccountChallenge?: ProviderAccountChallengeSession;
  };
};

function saveSession(request: ProviderAccountSessionRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

@Controller("v1/provider-connections")
@UseGuards(SessionAuthGuard)
export class ProviderConnectionsController {
  constructor(
    @Inject(ProviderConnectionsService)
    private readonly providerConnectionsService: ProviderConnectionsService
  ) {}

  @Get()
  getConnections(
    @CurrentUser() user: { userId: string; email: string; displayName: string; provider: "google"; providerSubject: string; avatarUrl: string | null; }
  ): Promise<GetProviderConnectionsResponse> {
    return this.providerConnectionsService.listConnections(user);
  }

  @Post("api-key")
  createApiKeyConnection(
    @CurrentUser() user: { userId: string; email: string; displayName: string; provider: "google"; providerSubject: string; avatarUrl: string | null; },
    @Body() payload: CreateApiKeyProviderConnectionDto
  ): Promise<ProviderConnectionMutationResponse> {
    return this.providerConnectionsService.createApiKeyConnection(user, payload);
  }

  @Post("provider-account/start")
  async startProviderAccountConnection(
    @CurrentUser() user: { userId: string; email: string; displayName: string; provider: "google"; providerSubject: string; avatarUrl: string | null; },
    @Req() request: ProviderAccountSessionRequest,
    @Body() payload: StartProviderAccountConnectionDto
  ): Promise<StartProviderAccountConnectionResponse> {
    const issued = this.providerConnectionsService.issueProviderAccountChallenge(
      user,
      payload
    );

    request.session.providerAccountChallenge = issued.session;
    await saveSession(request);

    return issued.response;
  }

  @Post("provider-account/complete")
  async completeProviderAccountConnection(
    @CurrentUser() user: { userId: string; email: string; displayName: string; provider: "google"; providerSubject: string; avatarUrl: string | null; },
    @Req() request: ProviderAccountSessionRequest,
    @Body() payload: CompleteProviderAccountConnectionDto
  ): Promise<ProviderConnectionMutationResponse> {
    const response =
      await this.providerConnectionsService.completeProviderAccountConnection(
        user,
        payload,
        request.session.providerAccountChallenge ?? null
      );

    delete request.session.providerAccountChallenge;
    await saveSession(request);

    return response;
  }

  @Patch(":connectionId")
  updateConnection(
    @CurrentUser() user: { userId: string; email: string; displayName: string; provider: "google"; providerSubject: string; avatarUrl: string | null; },
    @Param("connectionId") connectionId: string,
    @Body() payload: UpdateProviderConnectionDto
  ): Promise<ProviderConnectionMutationResponse> {
    return this.providerConnectionsService.updateConnection(
      user,
      connectionId,
      payload
    );
  }

  @Delete(":connectionId")
  async deleteConnection(
    @CurrentUser() user: { userId: string; email: string; displayName: string; provider: "google"; providerSubject: string; avatarUrl: string | null; },
    @Param("connectionId") connectionId: string
  ): Promise<DeleteProviderConnectionResponse> {
    await this.providerConnectionsService.deleteConnection(user, connectionId);

    return {
      success: true,
    };
  }
}
