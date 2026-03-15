import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AuthenticatedUser,
  GetProviderConnectionsResponse,
  ProviderCapability,
  ProviderConnectionMutationResponse,
  ProviderConnectionSummary,
  StartProviderAccountConnectionResponse,
} from "@tarology/shared";
import { randomUUID } from "node:crypto";
import type { ProviderConnection, ProviderCredential } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { ProviderSecretsService } from "./provider-secrets.service.js";
import {
  getProviderConnectionsRuntimeConfig,
  isOpenAiProviderAccountAllowlisted,
} from "./provider-connections-runtime-config.js";
import type { CreateApiKeyProviderConnectionDto } from "./dto/create-api-key-provider-connection.dto.js";
import type { StartProviderAccountConnectionDto } from "./dto/start-provider-account-connection.dto.js";
import type { CompleteProviderAccountConnectionDto } from "./dto/complete-provider-account-connection.dto.js";
import type { UpdateProviderConnectionDto } from "./dto/update-provider-connection.dto.js";

type ConnectionRecord = ProviderConnection & {
  credential: ProviderCredential | null;
};

export interface ProviderAccountChallengeSession {
  token: string;
  provider: "openai";
  displayName: string;
  makeDefault?: boolean;
  expiresAt: string;
}

interface IssuedProviderAccountChallenge {
  session: ProviderAccountChallengeSession;
  response: StartProviderAccountConnectionResponse;
}

@Injectable()
export class ProviderConnectionsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProviderSecretsService)
    private readonly providerSecretsService: ProviderSecretsService
  ) {}

  async listConnections(user: AuthenticatedUser): Promise<GetProviderConnectionsResponse> {
    const connections = await this.prisma.providerConnection.findMany({
      where: { userId: user.userId },
      include: { credential: true },
      orderBy: { updatedAt: "desc" },
    });

    return {
      capabilities: this.getCapabilities(user),
      connections: connections.map((connection) => this.toSummary(connection)),
    };
  }

  async createApiKeyConnection(
    user: AuthenticatedUser,
    payload: CreateApiKeyProviderConnectionDto
  ): Promise<ProviderConnectionMutationResponse> {
    const normalizedApiKey = payload.apiKey.trim();
    if (normalizedApiKey.length === 0) {
      throw new BadRequestException("API key must not be empty.");
    }

    const displayName = this.resolveDisplayName(
      payload.displayName,
      "OpenAI API key"
    );
    const encryptedSecret = this.providerSecretsService.encryptSecret(normalizedApiKey);
    const secretHint = this.providerSecretsService.maskApiKey(normalizedApiKey);
    const isDefault = await this.resolveDefaultFlag(user.userId, payload.makeDefault);

    let connection: ConnectionRecord;
    if (isDefault) {
      [, connection] = await this.prisma.$transaction([
        this.prisma.providerConnection.updateMany({
          where: {
            userId: user.userId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        }),
        this.prisma.providerConnection.create({
          data: {
            userId: user.userId,
            provider: "openai",
            credentialMode: "api_key",
            status: "active",
            displayName,
            isDefault,
            lastValidatedAt: new Date(),
            credential: {
              create: {
                encryptedSecret,
                secretHint,
              },
            },
          },
          include: { credential: true },
        }),
      ]);
    } else {
      connection = await this.prisma.providerConnection.create({
        data: {
          userId: user.userId,
          provider: "openai",
          credentialMode: "api_key",
          status: "active",
          displayName,
          isDefault,
          lastValidatedAt: new Date(),
          credential: {
            create: {
              encryptedSecret,
              secretHint,
            },
          },
        },
        include: { credential: true },
      });
    }

    return {
      connection: this.toSummary(connection),
    };
  }

  issueProviderAccountChallenge(
    user: AuthenticatedUser,
    payload: StartProviderAccountConnectionDto
  ): IssuedProviderAccountChallenge {
    this.assertProviderAccountAccess(user);

    const expiresAt = new Date(
      Date.now() + getProviderConnectionsRuntimeConfig().providerAccountChallengeTtlMs
    );
    const displayName = this.resolveDisplayName(
      payload.displayName,
      "OpenAI provider account"
    );
    const token = randomUUID();

    return {
      session: {
        token,
        provider: "openai",
        displayName,
        makeDefault: payload.makeDefault,
        expiresAt: expiresAt.toISOString(),
      },
      response: {
        provider: "openai",
        challengeToken: token,
        expiresAt: expiresAt.toISOString(),
        flow: "internal_allowlisted",
        message:
          "OpenAI provider-account mode is allowlisted for this account. Complete the internal connection from the same authenticated session.",
      },
    };
  }

  async completeProviderAccountConnection(
    user: AuthenticatedUser,
    payload: CompleteProviderAccountConnectionDto,
    challenge: ProviderAccountChallengeSession | null
  ): Promise<ProviderConnectionMutationResponse> {
    this.assertProviderAccountAccess(user);

    if (!challenge) {
      throw new BadRequestException("Provider-account start session is missing.");
    }

    if (challenge.provider !== payload.provider || challenge.token !== payload.challengeToken) {
      throw new BadRequestException("Provider-account challenge token is invalid.");
    }

    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException("Provider-account challenge token has expired.");
    }

    const isDefault = await this.resolveDefaultFlag(
      user.userId,
      challenge.makeDefault
    );

    let connection: ConnectionRecord;
    if (isDefault) {
      [, connection] = await this.prisma.$transaction([
        this.prisma.providerConnection.updateMany({
          where: {
            userId: user.userId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        }),
        this.prisma.providerConnection.create({
          data: {
            userId: user.userId,
            provider: "openai",
            credentialMode: "provider_account",
            status: "active",
            displayName: challenge.displayName,
            isDefault,
            lastValidatedAt: new Date(),
          },
          include: { credential: true },
        }),
      ]);
    } else {
      connection = await this.prisma.providerConnection.create({
        data: {
          userId: user.userId,
          provider: "openai",
          credentialMode: "provider_account",
          status: "active",
          displayName: challenge.displayName,
          isDefault,
          lastValidatedAt: new Date(),
        },
        include: { credential: true },
      });
    }

    return {
      connection: this.toSummary(connection),
    };
  }

  async updateConnection(
    user: AuthenticatedUser,
    connectionId: string,
    payload: UpdateProviderConnectionDto
  ): Promise<ProviderConnectionMutationResponse> {
    const existing = await this.requireOwnedConnection(user.userId, connectionId);

    const data = {
      ...(payload.displayName === undefined
        ? {}
        : {
            displayName: this.resolveDisplayName(
              payload.displayName,
              existing.displayName
            ),
          }),
      ...(payload.makeDefault === undefined
        ? {}
        : {
            isDefault: payload.makeDefault,
          }),
    };

    let connection: ConnectionRecord;
    if (payload.makeDefault === true) {
      [, connection] = await this.prisma.$transaction([
        this.prisma.providerConnection.updateMany({
          where: {
            userId: user.userId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        }),
        this.prisma.providerConnection.update({
          where: { id: existing.id },
          data,
          include: { credential: true },
        }),
      ]);
    } else {
      connection = await this.prisma.providerConnection.update({
        where: { id: existing.id },
        data,
        include: { credential: true },
      });
    }

    return {
      connection: this.toSummary(connection),
    };
  }

  async deleteConnection(user: AuthenticatedUser, connectionId: string): Promise<void> {
    await this.requireOwnedConnection(user.userId, connectionId);

    await this.prisma.providerConnection.delete({
      where: { id: connectionId },
    });
  }

  getCapabilities(user: AuthenticatedUser): ProviderCapability[] {
    const allowlisted = isOpenAiProviderAccountAllowlisted(
      getProviderConnectionsRuntimeConfig(),
      user
    );

    return [
      {
        provider: "openai",
        supportsApiKey: true,
        supportsProviderAccount: allowlisted,
        supportsStreaming: false,
        supportsBackground: false,
        providerAccountNotice: allowlisted
          ? "Internal OpenAI provider-account mode is enabled for this account."
          : "Not available for this account yet.",
      },
    ];
  }

  private async requireOwnedConnection(
    userId: string,
    connectionId: string
  ): Promise<ConnectionRecord> {
    const connection = await this.prisma.providerConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
      include: { credential: true },
    });

    if (!connection) {
      throw new NotFoundException("Provider connection not found.");
    }

    return connection;
  }

  private async resolveDefaultFlag(
    userId: string,
    requested: boolean | undefined
  ): Promise<boolean> {
    if (requested !== undefined) {
      return requested;
    }

    const existingDefault = await this.prisma.providerConnection.count({
      where: {
        userId,
        isDefault: true,
      },
    });

    return existingDefault === 0;
  }

  private assertProviderAccountAccess(user: AuthenticatedUser): void {
    const allowlisted = isOpenAiProviderAccountAllowlisted(
      getProviderConnectionsRuntimeConfig(),
      user
    );

    if (!allowlisted) {
      throw new ForbiddenException(
        "Provider-account mode is not available for this account."
      );
    }
  }

  private resolveDisplayName(value: string | undefined, fallback: string): string {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : fallback;
  }

  private toSummary(connection: ConnectionRecord): ProviderConnectionSummary {
    return {
      id: connection.id,
      provider: connection.provider,
      credentialMode: connection.credentialMode,
      status: connection.status,
      displayName: connection.displayName,
      isDefault: connection.isDefault,
      maskedCredentialHint: connection.credential?.secretHint ?? null,
      lastValidatedAt: connection.lastValidatedAt?.toISOString() ?? null,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    };
  }
}
