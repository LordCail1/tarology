import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import type {
  ApiConflictResponse,
  AuthenticatedUser,
  CanvasMode,
  CreateReadingResponse,
  GetReadingResponse,
  ListReadingsResponse,
  ReadingCommandRequest,
  ReadingCommandResponse,
  ReadingDetail,
  ReadingLifecycleStatus,
  ReadingListStatusFilter,
} from "@tarology/shared";
import { PrismaService } from "../database/prisma.service.js";
import { toCreateReadingResponse, toReadingDetail, toReadingSummary } from "./reading-contract.mapper.js";
import { DeckCatalogService } from "./deck-catalog.service.js";
import { applyReadingEvent } from "./domain/reading-projector.js";
import {
  READING_ARCHIVED_EVENT,
  READING_CREATED_EVENT,
  READING_DELETED_EVENT,
  READING_REOPENED_EVENT,
  type ReadingEventPayload,
  type ReadingEventType,
  type ReadingLifecycleEventPayload,
  type ReadingStoredEvent,
} from "./domain/reading-events.js";
import { buildDeterministicCardAssignment } from "./domain/deterministic-shuffle.js";
import { CreateReadingDto } from "./dto/create-reading.dto.js";
import { ReadingCommandDto } from "./dto/reading-command.dto.js";
import { ReadingEventsRepository } from "./repositories/reading-events.repository.js";
import { ReadingIdempotencyRepository } from "./repositories/reading-idempotency.repository.js";
import { ReadingsRepository } from "./repositories/readings.repository.js";
import { ReadingSnapshotsRepository } from "./repositories/reading-snapshots.repository.js";

interface CreateReadingResult {
  created: boolean;
  response: CreateReadingResponse;
}

class VersionConflictError extends Error {}

function normalizeCanvasMode(value: CanvasMode | undefined): CanvasMode {
  return value ?? "freeform";
}

function toOptionalDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toReadingDetailFromJson(value: Prisma.JsonValue): ReadingDetail {
  return value as unknown as ReadingDetail;
}

function toCreateReadingResponseFromJson(value: Prisma.JsonValue): CreateReadingResponse {
  return value as unknown as CreateReadingResponse;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableStringify(
            (value as Record<string, unknown>)[key]
          )}`
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashRequest(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function buildConflict(
  code: ApiConflictResponse["code"],
  message: string,
  currentVersion?: number
): ConflictException {
  const body: ApiConflictResponse = {
    code,
    message,
    ...(currentVersion === undefined ? {} : { currentVersion }),
  };

  return new ConflictException(body);
}

@Injectable()
export class ReadingsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(DeckCatalogService)
    private readonly deckCatalogService: DeckCatalogService,
    @Inject(ReadingsRepository)
    private readonly readingsRepository: ReadingsRepository,
    @Inject(ReadingEventsRepository)
    private readonly readingEventsRepository: ReadingEventsRepository,
    @Inject(ReadingSnapshotsRepository)
    private readonly readingSnapshotsRepository: ReadingSnapshotsRepository,
    @Inject(ReadingIdempotencyRepository)
    private readonly readingIdempotencyRepository: ReadingIdempotencyRepository
  ) {}

  async createReading(
    user: AuthenticatedUser,
    payload: CreateReadingDto,
    idempotencyKey: string
  ): Promise<CreateReadingResult> {
    const normalizedRequest = {
      rootQuestion: payload.rootQuestion,
      deckId: payload.deckId ?? null,
      deckSpecVersion: payload.deckSpecVersion,
      canvasMode: normalizeCanvasMode(payload.canvasMode),
    };

    const requestHash = hashRequest({
      ownerUserId: user.userId,
      request: normalizedRequest,
    });

    const existingReceipt = await this.readingIdempotencyRepository.findCreateReceipt(
      user.userId,
      idempotencyKey
    );
    if (existingReceipt) {
      return {
        created: false,
        response: this.replayCreateReceipt(existingReceipt.requestHash, requestHash, existingReceipt.responseJson),
      };
    }

    const resolvedDeckId =
      normalizedRequest.deckId ?? (await this.getUserDefaultDeckId(user.userId));
    if (!resolvedDeckId) {
      throw new ConflictException(
        "Default deck selection is required before creating a reading."
      );
    }

    const deck = await this.deckCatalogService.requireDeck(resolvedDeckId);
    if (normalizedRequest.deckSpecVersion !== deck.summary.specVersion) {
      throw new ConflictException(
        `Deck spec version "${normalizedRequest.deckSpecVersion}" does not match deck "${resolvedDeckId}".`
      );
    }

    const builtAssignment = buildDeterministicCardAssignment(deck.spec.cardIds);
    const readingId = randomUUID();
    const createdAt = new Date();

    const response: CreateReadingResponse = {
      readingId,
      rootQuestion: normalizedRequest.rootQuestion,
      deckId: deck.summary.id,
      deckSpecVersion: deck.summary.specVersion,
      canvasMode: normalizedRequest.canvasMode,
      status: "active",
      version: 1,
      shuffleAlgorithmVersion: builtAssignment.shuffleAlgorithmVersion,
      seedCommitment: builtAssignment.seedCommitment,
      orderHash: builtAssignment.orderHash,
      assignments: builtAssignment.assignments,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      archivedAt: null,
      deletedAt: null,
    };

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.readingsRepository.create(tx, {
          id: response.readingId,
          ownerUserId: user.userId,
          rootQuestion: response.rootQuestion,
          deckId: response.deckId,
          deckSpecVersion: response.deckSpecVersion,
          shuffleAlgorithmVersion: response.shuffleAlgorithmVersion,
          seedCommitment: response.seedCommitment,
          orderHash: response.orderHash,
          canvasMode: response.canvasMode,
          version: response.version,
          createdAt,
          updatedAt: createdAt,
          archivedAt: null,
          deletedAt: null,
          cards: response.assignments.map((assignment) => ({
            deckIndex: assignment.deckIndex,
            cardId: assignment.cardId,
            assignedReversal: assignment.assignedReversal,
            createdAt,
          })),
        });

        await this.readingEventsRepository.append(tx, {
          id: randomUUID(),
          readingId: response.readingId,
          ownerUserId: user.userId,
          version: response.version,
          eventType: READING_CREATED_EVENT,
          payload: toJson(response),
          commandId: null,
          idempotencyKey,
          createdAt,
        });

        await this.readingSnapshotsRepository.create(tx, {
          id: randomUUID(),
          readingId: response.readingId,
          version: response.version,
          projection: toJson(response),
          createdAt,
        });

        await this.readingIdempotencyRepository.createCreateReceipt(tx, {
          id: randomUUID(),
          ownerUserId: user.userId,
          idempotencyKey,
          requestHash,
          readingId: response.readingId,
          responseJson: toJson(response),
          createdAt,
        });
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const receipt = await this.readingIdempotencyRepository.findCreateReceipt(
          user.userId,
          idempotencyKey
        );
        if (receipt) {
          return {
            created: false,
            response: this.replayCreateReceipt(
              receipt.requestHash,
              requestHash,
              receipt.responseJson
            ),
          };
        }
      }

      throw error;
    }

    return {
      created: true,
      response,
    };
  }

  async listReadings(
    user: AuthenticatedUser,
    status: ReadingListStatusFilter = "all"
  ): Promise<ListReadingsResponse> {
    const readings = await this.readingsRepository.listOwned(user.userId, status);

    return {
      readings: readings.map((reading) => toReadingSummary(reading)),
    };
  }

  async getReading(
    user: AuthenticatedUser,
    readingId: string
  ): Promise<GetReadingResponse> {
    const reading = await this.readingsRepository.findOwnedById(user.userId, readingId);
    if (!reading) {
      throw new NotFoundException("Reading not found.");
    }

    return toReadingDetail(reading);
  }

  async applyCommand(
    user: AuthenticatedUser,
    readingId: string,
    idempotencyKey: string,
    payload: ReadingCommandDto
  ): Promise<ReadingCommandResponse> {
    this.assertEmptyPayload(payload.payload);

    const requestHash = hashRequest({
      readingId,
      command: {
        commandId: payload.commandId,
        expectedVersion: payload.expectedVersion,
        type: payload.type,
        payload: {},
      },
    });

    const replay = await this.getCommandReplay(readingId, payload, idempotencyKey, requestHash);
    if (replay) {
      return replay;
    }

    const currentRecord = await this.readingsRepository.findOwnedById(
      user.userId,
      readingId,
      true
    );
    if (!currentRecord || currentRecord.deletedAt !== null) {
      throw new NotFoundException("Reading not found.");
    }

    const currentDetail = toReadingDetail(currentRecord);
    if (currentDetail.version !== payload.expectedVersion) {
      throw buildConflict(
        "version_conflict",
        `Expected reading version ${payload.expectedVersion}, received ${currentDetail.version}.`,
        currentDetail.version
      );
    }

    const nextEvent = this.buildLifecycleEvent(currentDetail, payload.type);
    const nextProjection = applyReadingEvent(currentDetail, nextEvent);
    const commandTimestamp = new Date(nextProjection.updatedAt);

    try {
      await this.prisma.$transaction(async (tx) => {
        const updatedCount = await this.readingsRepository.updateLifecycle(tx, {
          readingId,
          ownerUserId: user.userId,
          expectedVersion: currentDetail.version,
          status: nextProjection.status,
          version: nextProjection.version,
          updatedAt: commandTimestamp,
          archivedAt: toOptionalDate(nextProjection.archivedAt),
          deletedAt: toOptionalDate(nextProjection.deletedAt),
        });

        if (updatedCount !== 1) {
          throw new VersionConflictError();
        }

        await this.readingEventsRepository.append(tx, {
          id: randomUUID(),
          readingId,
          ownerUserId: user.userId,
          version: nextProjection.version,
          eventType: nextEvent.eventType,
          payload: toJson(nextEvent.payload),
          commandId: payload.commandId,
          idempotencyKey,
          createdAt: commandTimestamp,
        });

        await this.readingSnapshotsRepository.create(tx, {
          id: randomUUID(),
          readingId,
          version: nextProjection.version,
          projection: toJson(nextProjection),
          createdAt: commandTimestamp,
        });

        await this.readingIdempotencyRepository.createCommandReceipt(tx, {
          id: randomUUID(),
          readingId,
          ownerUserId: user.userId,
          commandId: payload.commandId,
          idempotencyKey,
          requestHash,
          resultingVersion: nextProjection.version,
          responseJson: toJson({ reading: nextProjection }),
          createdAt: commandTimestamp,
        });
      });
    } catch (error) {
      if (error instanceof VersionConflictError) {
        const latest = await this.readingsRepository.findCurrentVersion(user.userId, readingId);
        const currentVersion = latest?.version ?? payload.expectedVersion;

        throw buildConflict(
          "version_conflict",
          `Expected reading version ${payload.expectedVersion}, received ${currentVersion}.`,
          currentVersion
        );
      }

      if (this.isUniqueConstraintError(error)) {
        const duplicateReplay = await this.getCommandReplay(
          readingId,
          payload,
          idempotencyKey,
          requestHash
        );
        if (duplicateReplay) {
          return duplicateReplay;
        }
      }

      throw error;
    }

    return {
      reading: nextProjection,
    };
  }

  async restoreReadingFromHistory(
    ownerUserId: string,
    readingId: string
  ): Promise<ReadingDetail | null> {
    const currentRecord = await this.readingsRepository.findOwnedById(
      ownerUserId,
      readingId,
      true
    );
    if (!currentRecord) {
      return null;
    }

    const latestSnapshot = await this.readingSnapshotsRepository.findLatest(readingId);
    let projection = latestSnapshot
      ? toReadingDetailFromJson(latestSnapshot.projection)
      : null;

    const events = await this.readingEventsRepository.listAfterVersion(
      readingId,
      latestSnapshot?.version ?? 0
    );

    for (const event of events) {
      projection = applyReadingEvent(projection, {
        eventType: event.eventType as ReadingEventType,
        payload: event.payload as unknown as ReadingEventPayload,
        version: event.version,
      });
    }

    return projection;
  }

  private replayCreateReceipt(
    persistedHash: string,
    requestHash: string,
    responseJson: Prisma.JsonValue
  ): CreateReadingResponse {
    if (persistedHash !== requestHash) {
      throw buildConflict(
        "idempotency_conflict",
        "Idempotency-Key was already used with a different create-reading payload."
      );
    }

    return toCreateReadingResponseFromJson(responseJson);
  }

  private async getCommandReplay(
    readingId: string,
    payload: ReadingCommandRequest,
    idempotencyKey: string,
    requestHash: string
  ): Promise<ReadingCommandResponse | null> {
    const receiptByIdempotencyKey =
      await this.readingIdempotencyRepository.findCommandReceiptByIdempotencyKey(
        readingId,
        idempotencyKey
      );

    if (receiptByIdempotencyKey) {
      if (receiptByIdempotencyKey.requestHash !== requestHash) {
        throw buildConflict(
          "idempotency_conflict",
          "Idempotency-Key was already used with a different reading command payload."
        );
      }

      return receiptByIdempotencyKey.responseJson as unknown as ReadingCommandResponse;
    }

    const receiptByCommandId =
      await this.readingIdempotencyRepository.findCommandReceiptByCommandId(
        readingId,
        payload.commandId
      );

    if (!receiptByCommandId) {
      return null;
    }

    if (receiptByCommandId.requestHash !== requestHash) {
      throw buildConflict(
        "command_conflict",
        `Command "${payload.commandId}" was already used with a different payload.`
      );
    }

    return receiptByCommandId.responseJson as unknown as ReadingCommandResponse;
  }

  private buildLifecycleEvent(
    currentDetail: ReadingDetail,
    commandType: ReadingCommandRequest["type"]
  ): ReadingStoredEvent {
    const timestamp = new Date().toISOString();

    switch (commandType) {
      case "archive_reading": {
        if (currentDetail.status !== "active") {
          throw buildConflict(
            "command_conflict",
            `Cannot archive a reading in "${currentDetail.status}" state.`
          );
        }

        return this.createLifecycleEvent(
          READING_ARCHIVED_EVENT,
          "archived",
          currentDetail.version + 1,
          timestamp,
          timestamp,
          currentDetail.deletedAt
        );
      }

      case "reopen_reading": {
        if (currentDetail.status !== "archived") {
          throw buildConflict(
            "command_conflict",
            `Cannot reopen a reading in "${currentDetail.status}" state.`
          );
        }

        return this.createLifecycleEvent(
          READING_REOPENED_EVENT,
          "active",
          currentDetail.version + 1,
          timestamp,
          null,
          currentDetail.deletedAt
        );
      }

      case "delete_reading": {
        if (currentDetail.status !== "active" && currentDetail.status !== "archived") {
          throw buildConflict(
            "command_conflict",
            `Cannot delete a reading in "${currentDetail.status}" state.`
          );
        }

        return this.createLifecycleEvent(
          READING_DELETED_EVENT,
          "deleted",
          currentDetail.version + 1,
          timestamp,
          currentDetail.archivedAt,
          timestamp
        );
      }

      default:
        throw new BadRequestException(`Unsupported reading command "${commandType}".`);
    }
  }

  private createLifecycleEvent(
    eventType: ReadingEventType,
    status: ReadingLifecycleStatus,
    version: number,
    updatedAt: string,
    archivedAt: string | null,
    deletedAt: string | null
  ): ReadingStoredEvent {
    const payload: ReadingLifecycleEventPayload = {
      status,
      version,
      updatedAt,
      archivedAt,
      deletedAt,
    };

    return {
      eventType,
      version,
      payload,
    };
  }

  private assertEmptyPayload(payload: Record<string, never>): void {
    if (Array.isArray(payload) || Object.keys(payload).length > 0) {
      throw new BadRequestException("Reading command payload must be an empty object.");
    }
  }

  private async getUserDefaultDeckId(userId: string): Promise<string | null> {
    const preference = await this.prisma.userPreference.findUnique({
      where: { userId },
      select: { defaultDeckId: true },
    });

    return preference?.defaultDeckId ?? null;
  }

  private isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    );
  }
}
