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
  CreateReadingResponse,
  FlipCardPayload,
  GetReadingResponse,
  ListReadingsResponse,
  MoveCardPayload,
  ReadingCommandRequest,
  ReadingCommandResponse,
  ReadingDetail,
  ReadingLifecycleStatus,
  ReadingListStatusFilter,
  RotateCardPayload,
} from "@tarology/shared";
import { PrismaService } from "../database/prisma.service.js";
import { DecksService } from "../knowledge/decks.service.js";
import { toCreateReadingResponse, toReadingDetail, toReadingSummary } from "./reading-contract.mapper.js";
import { applyReadingEvent } from "./domain/reading-projector.js";
import {
  READING_ARCHIVED_EVENT,
  READING_CARD_FLIPPED_EVENT,
  READING_CARD_MOVED_EVENT,
  READING_CARD_ROTATED_EVENT,
  READING_CREATED_EVENT,
  READING_DELETED_EVENT,
  READING_REOPENED_EVENT,
  type ReadingCardFlippedEventPayload,
  type ReadingCardMovedEventPayload,
  type ReadingCardRotatedEventPayload,
  type ReadingEventPayload,
  type ReadingEventType,
  type ReadingLifecycleEventPayload,
  type ReadingStoredEvent,
} from "./domain/reading-events.js";
import {
  buildInitialCanvasCards,
  getHighestStackOrder,
  normalizeRotation,
} from "./domain/reading-canvas.js";
import { buildDeterministicCardAssignment } from "./domain/deterministic-shuffle.js";
import {
  markLegacyCanvasModeShim,
  normalizeLegacyReadingDetail,
  resolveLegacyGridFreeformPosition,
  stripLegacyCanvasModeInternalFields,
} from "./domain/legacy-grid-compat.js";
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

type LegacyCanvasMode = "freeform" | "grid";

interface LegacySwitchCanvasModePayload {
  canvasMode: LegacyCanvasMode;
}

interface LegacySwitchCanvasModeCommandRequest {
  commandId: string;
  expectedVersion: number;
  type: "switch_canvas_mode";
  payload: LegacySwitchCanvasModePayload;
}

type NormalizedReadingCommand = ReadingCommandRequest | LegacySwitchCanvasModeCommandRequest;

class VersionConflictError extends Error {}
class MissingCardError extends Error {}

function toOptionalDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toReadingDetailFromJson(value: Prisma.JsonValue): ReadingDetail {
  return normalizeReadingDetail(value as unknown as ReadingDetail);
}

function toCreateReadingResponseFromJson(value: Prisma.JsonValue): CreateReadingResponse {
  return normalizeLegacyReadingDetail(value as unknown as CreateReadingResponse);
}

function normalizeReadingDetail<T extends ReadingDetail | CreateReadingResponse>(value: T): T {
  return normalizeLegacyReadingDetail(value);
}

function sanitizeReadingForResponse<T extends ReadingDetail | CreateReadingResponse>(value: T): T {
  return stripLegacyCanvasModeInternalFields(value);
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

function isEmptyObject(value: unknown): value is Record<string, never> {
  return !!value && !Array.isArray(value) && typeof value === "object" && Object.keys(value).length === 0;
}

function isLegacySwitchCanvasModeCommand(
  command: NormalizedReadingCommand
): command is LegacySwitchCanvasModeCommandRequest {
  return command.type === "switch_canvas_mode";
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
    @Inject(DecksService)
    private readonly decksService: DecksService,
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

    const deck = await this.decksService.requireDeckForReading(user.userId, resolvedDeckId);
    if (normalizedRequest.deckSpecVersion !== deck.summary.specVersion) {
      throw new ConflictException(
        `Deck spec version "${normalizedRequest.deckSpecVersion}" does not match deck "${resolvedDeckId}".`
      );
    }

    const builtAssignment = buildDeterministicCardAssignment(deck.cardIds);
    const canvasCards = buildInitialCanvasCards(builtAssignment.assignments);
    const readingId = randomUUID();
    const createdAt = new Date();

    const response: CreateReadingResponse = normalizeLegacyReadingDetail({
      readingId,
      rootQuestion: normalizedRequest.rootQuestion,
      deckId: deck.summary.id,
      deckSpecVersion: deck.summary.specVersion,
      cardCount: builtAssignment.assignments.length,
      status: "active",
      version: 1,
      shuffleAlgorithmVersion: builtAssignment.shuffleAlgorithmVersion,
      seedCommitment: builtAssignment.seedCommitment,
      orderHash: builtAssignment.orderHash,
      assignments: builtAssignment.assignments,
      canvas: {
        cards: canvasCards,
      },
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      archivedAt: null,
      deletedAt: null,
    });

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
          version: response.version,
          createdAt,
          updatedAt: createdAt,
          archivedAt: null,
          deletedAt: null,
          cards: response.canvas.cards.map((card) => ({
            deckIndex: card.deckIndex,
            cardId: card.cardId,
            assignedReversal: card.assignedReversal,
            isFaceUp: card.isFaceUp,
            rotationDeg: card.rotationDeg,
            freeformXPx: card.freeform.xPx,
            freeformYPx: card.freeform.yPx,
            freeformStackOrder: card.freeform.stackOrder,
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
    const reading = await this.restoreReadingFromHistory(user.userId, readingId);
    if (!reading || reading.deletedAt !== null) {
      throw new NotFoundException("Reading not found.");
    }

    return sanitizeReadingForResponse(reading);
  }

  async applyCommand(
    user: AuthenticatedUser,
    readingId: string,
    idempotencyKey: string,
    payload: ReadingCommandDto
  ): Promise<ReadingCommandResponse> {
    const command = this.normalizeCommandPayload(payload);

    const requestHash = hashRequest({
      readingId,
      command: {
        commandId: command.commandId,
        expectedVersion: command.expectedVersion,
        type: command.type,
        payload: command.payload,
      },
    });

    const currentRecord = await this.readingsRepository.findOwnedById(
      user.userId,
      readingId,
      true
    );
    if (!currentRecord) {
      throw new NotFoundException("Reading not found.");
    }

    const replay = await this.getCommandReplay(readingId, command, idempotencyKey, requestHash);
    if (replay) {
      return replay;
    }

    if (currentRecord.deletedAt !== null) {
      throw new NotFoundException("Reading not found.");
    }

    const currentDetail =
      (await this.restoreReadingFromHistory(user.userId, readingId)) ??
      toReadingDetail(currentRecord);
    if (currentDetail.version !== command.expectedVersion) {
      throw buildConflict(
        "version_conflict",
        `Expected reading version ${command.expectedVersion}, received ${currentDetail.version}.`,
        currentDetail.version
      );
    }

    if (isLegacySwitchCanvasModeCommand(command)) {
      return this.applyLegacyCanvasModeCompatibilityCommand({
        user,
        readingId,
        idempotencyKey,
        requestHash,
        command,
        currentDetail,
      });
    }

    let nextEvent: ReadingStoredEvent;
    let nextProjection: ReadingDetail;
    let commandTimestamp: Date;

    try {
      nextEvent = this.buildCommandEvent(currentDetail, command);
      nextProjection = applyReadingEvent(currentDetail, nextEvent);
      commandTimestamp = new Date(nextProjection.updatedAt);

      await this.prisma.$transaction(async (tx) => {
        const updatedCount = await this.applyProjectionUpdate(tx, {
          readingId,
          ownerUserId: user.userId,
          currentDetail,
          nextProjection,
          commandTimestamp,
          command,
          eventType: nextEvent.eventType,
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
          commandId: command.commandId,
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
          commandId: command.commandId,
          idempotencyKey,
          requestHash,
          resultingVersion: nextProjection.version,
          responseJson: toJson({ reading: sanitizeReadingForResponse(nextProjection) }),
          createdAt: commandTimestamp,
        });
      });
    } catch (error) {
      if (error instanceof VersionConflictError) {
        const duplicateReplay = await this.getCommandReplay(
          readingId,
          command,
          idempotencyKey,
          requestHash
        );
        if (duplicateReplay) {
          return duplicateReplay;
        }

        const latest = await this.readingsRepository.findCurrentVersion(user.userId, readingId);
        const currentVersion = latest?.version ?? payload.expectedVersion;

        throw buildConflict(
          "version_conflict",
          `Expected reading version ${command.expectedVersion}, received ${currentVersion}.`,
          currentVersion
        );
      }

      if (this.isUniqueConstraintError(error)) {
        const duplicateReplay = await this.getCommandReplay(
          readingId,
          command,
          idempotencyKey,
          requestHash
        );
        if (duplicateReplay) {
          return duplicateReplay;
        }
      }

      if (error instanceof MissingCardError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }

    return {
      reading: sanitizeReadingForResponse(nextProjection),
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

  private async applyLegacyCanvasModeCompatibilityCommand(input: {
    user: AuthenticatedUser;
    readingId: string;
    idempotencyKey: string;
    requestHash: string;
    command: LegacySwitchCanvasModeCommandRequest;
    currentDetail: ReadingDetail;
  }): Promise<ReadingCommandResponse> {
    const baseReading = normalizeLegacyReadingDetail(input.currentDetail);
    const commandTimestamp = new Date();
    const compatibilityReading = markLegacyCanvasModeShim({
      ...baseReading,
      version: input.currentDetail.version + 1,
      updatedAt: commandTimestamp.toISOString(),
      canvasMode: input.command.payload.canvasMode,
      canvas: {
        ...baseReading.canvas,
        activeMode: input.command.payload.canvasMode,
      },
    } as ReadingDetail & {
      canvasMode: LegacyCanvasMode;
      canvas: ReadingDetail["canvas"] & { activeMode: LegacyCanvasMode };
    });
    const response = {
      reading: sanitizeReadingForResponse(compatibilityReading),
    } satisfies ReadingCommandResponse;

    try {
      await this.prisma.$transaction(async (tx) => {
        const updatedCount = await this.readingsRepository.updateVersion(tx, {
          readingId: input.readingId,
          ownerUserId: input.user.userId,
          expectedVersion: input.currentDetail.version,
          version: compatibilityReading.version,
          updatedAt: commandTimestamp,
        });

        if (updatedCount !== 1) {
          throw new VersionConflictError();
        }

        await this.readingSnapshotsRepository.create(tx, {
          id: randomUUID(),
          readingId: input.readingId,
          version: compatibilityReading.version,
          projection: toJson(compatibilityReading),
          createdAt: commandTimestamp,
        });

        await this.readingIdempotencyRepository.createCommandReceipt(tx, {
          id: randomUUID(),
          readingId: input.readingId,
          ownerUserId: input.user.userId,
          commandId: input.command.commandId,
          idempotencyKey: input.idempotencyKey,
          requestHash: input.requestHash,
          resultingVersion: compatibilityReading.version,
          responseJson: toJson(response),
          createdAt: commandTimestamp,
        });
      });
    } catch (error) {
      if (error instanceof VersionConflictError) {
        const duplicateReplay = await this.getCommandReplay(
          input.readingId,
          input.command,
          input.idempotencyKey,
          input.requestHash
        );
        if (duplicateReplay) {
          return duplicateReplay;
        }

        const latest = await this.readingsRepository.findCurrentVersion(
          input.user.userId,
          input.readingId
        );
        const currentVersion = latest?.version ?? input.command.expectedVersion;

        throw buildConflict(
          "version_conflict",
          `Expected reading version ${input.command.expectedVersion}, received ${currentVersion}.`,
          currentVersion
        );
      }

      if (this.isUniqueConstraintError(error)) {
        const duplicateReplay = await this.getCommandReplay(
          input.readingId,
          input.command,
          input.idempotencyKey,
          input.requestHash
        );
        if (duplicateReplay) {
          return duplicateReplay;
        }
      }

      throw error;
    }

    return response;
  }

  private async getCommandReplay(
    readingId: string,
    payload: NormalizedReadingCommand,
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

  private buildCommandEvent(
    currentDetail: ReadingDetail,
    command: ReadingCommandRequest
  ): ReadingStoredEvent {
    const timestamp = new Date().toISOString();

    switch (command.type) {
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

      case "move_card": {
        const payload = command.payload as MoveCardPayload;
        const targetCard = currentDetail.canvas.cards.find((card) => card.cardId === payload.cardId);
        if (!targetCard) {
          throw new MissingCardError(`Card "${payload.cardId}" is not part of this reading.`);
        }

        return this.createCardMovedEvent(
          currentDetail,
          payload,
          currentDetail.version + 1,
          timestamp
        );
      }

      case "rotate_card": {
        const payload = command.payload as RotateCardPayload;
        const targetCard = currentDetail.canvas.cards.find((card) => card.cardId === payload.cardId);
        if (!targetCard) {
          throw new MissingCardError(`Card "${payload.cardId}" is not part of this reading.`);
        }

        return this.createCardRotatedEvent(
          payload.cardId,
          payload.deltaDeg,
          currentDetail.version + 1,
          timestamp
        );
      }

      case "flip_card": {
        const payload = command.payload as FlipCardPayload;
        const targetCard = currentDetail.canvas.cards.find((card) => card.cardId === payload.cardId);
        if (!targetCard) {
          throw new MissingCardError(`Card "${payload.cardId}" is not part of this reading.`);
        }

        return this.createCardFlippedEvent(
          payload.cardId,
          !targetCard.isFaceUp,
          currentDetail.version + 1,
          timestamp
        );
      }

      default:
        throw new BadRequestException(`Unsupported reading command "${command.type}".`);
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

  private createCardMovedEvent(
    currentDetail: ReadingDetail,
    payload: MoveCardPayload,
    version: number,
    updatedAt: string
  ): ReadingStoredEvent {
    const eventPayload: ReadingCardMovedEventPayload = {
      cardId: payload.cardId,
      version,
      updatedAt,
      freeform: {
        xPx: payload.freeform.xPx,
        yPx: payload.freeform.yPx,
        stackOrder: getHighestStackOrder(currentDetail.canvas.cards) + 1,
      },
    };

    return {
      eventType: READING_CARD_MOVED_EVENT,
      version,
      payload: eventPayload,
    };
  }

  private createCardRotatedEvent(
    cardId: string,
    deltaDeg: number,
    version: number,
    updatedAt: string
  ): ReadingStoredEvent {
    const payload: ReadingCardRotatedEventPayload = {
      cardId,
      deltaDeg,
      version,
      updatedAt,
    };

    return {
      eventType: READING_CARD_ROTATED_EVENT,
      version,
      payload,
    };
  }

  private createCardFlippedEvent(
    cardId: string,
    isFaceUp: boolean,
    version: number,
    updatedAt: string
  ): ReadingStoredEvent {
    const payload: ReadingCardFlippedEventPayload = {
      cardId,
      isFaceUp,
      version,
      updatedAt,
    };

    return {
      eventType: READING_CARD_FLIPPED_EVENT,
      version,
      payload,
    };
  }

  private async applyProjectionUpdate(
    tx: Prisma.TransactionClient,
    input: {
      readingId: string;
      ownerUserId: string;
      currentDetail: ReadingDetail;
      nextProjection: ReadingDetail;
      commandTimestamp: Date;
      command: ReadingCommandRequest;
      eventType: ReadingEventType;
    }
  ): Promise<number> {
    switch (input.eventType) {
      case READING_ARCHIVED_EVENT:
      case READING_REOPENED_EVENT:
      case READING_DELETED_EVENT:
        return this.readingsRepository.updateLifecycle(tx, {
          readingId: input.readingId,
          ownerUserId: input.ownerUserId,
          expectedVersion: input.currentDetail.version,
          status: input.nextProjection.status,
          version: input.nextProjection.version,
          updatedAt: input.commandTimestamp,
          archivedAt: toOptionalDate(input.nextProjection.archivedAt),
          deletedAt: toOptionalDate(input.nextProjection.deletedAt),
        });

      case READING_CARD_MOVED_EVENT:
      case READING_CARD_ROTATED_EVENT:
      case READING_CARD_FLIPPED_EVENT: {
        const readingUpdated = await this.readingsRepository.updateVersion(tx, {
          readingId: input.readingId,
          ownerUserId: input.ownerUserId,
          expectedVersion: input.currentDetail.version,
          version: input.nextProjection.version,
          updatedAt: input.commandTimestamp,
        });

        if (readingUpdated !== 1) {
          return readingUpdated;
        }

        const targetCard =
          input.command.type === "move_card" ||
          input.command.type === "rotate_card" ||
          input.command.type === "flip_card"
            ? input.nextProjection.canvas.cards.find(
                (card) => card.cardId === (input.command.payload as MoveCardPayload | RotateCardPayload | FlipCardPayload).cardId
              )
            : null;

        if (!targetCard) {
          throw new MissingCardError("Reading card projection was not found after applying command.");
        }

        const cardUpdated = await this.readingsRepository.updateCardCanvasState(tx, {
          readingId: input.readingId,
          cardId: targetCard.cardId,
          data: {
            isFaceUp: targetCard.isFaceUp,
            rotationDeg: targetCard.rotationDeg,
            freeformXPx: targetCard.freeform.xPx,
            freeformYPx: targetCard.freeform.yPx,
            freeformStackOrder: targetCard.freeform.stackOrder,
          },
        });

        if (cardUpdated !== 1) {
          throw new MissingCardError(`Card "${targetCard.cardId}" is not part of this reading.`);
        }

        return readingUpdated;
      }

      default:
        throw new BadRequestException(`Unsupported reading event "${input.eventType}".`);
    }
  }

  private normalizeCommandPayload(payload: ReadingCommandDto): NormalizedReadingCommand {
    switch (payload.type) {
      case "archive_reading":
      case "reopen_reading":
      case "delete_reading": {
        if (!isEmptyObject(payload.payload)) {
          throw new BadRequestException("Reading lifecycle command payload must be an empty object.");
        }

        return {
          commandId: payload.commandId,
          expectedVersion: payload.expectedVersion,
          type: payload.type,
          payload: {},
        };
      }

      case "switch_canvas_mode":
        return {
          commandId: payload.commandId,
          expectedVersion: payload.expectedVersion,
          type: "switch_canvas_mode",
          payload: this.parseCanvasModePayload(payload.payload),
        };

      case "move_card":
        return {
          commandId: payload.commandId,
          expectedVersion: payload.expectedVersion,
          type: "move_card",
          payload: this.parseMoveCardPayload(payload.payload),
        };

      case "rotate_card":
        return {
          commandId: payload.commandId,
          expectedVersion: payload.expectedVersion,
          type: "rotate_card",
          payload: this.parseRotateCardPayload(payload.payload),
        };

      case "flip_card":
        return {
          commandId: payload.commandId,
          expectedVersion: payload.expectedVersion,
          type: "flip_card",
          payload: this.parseFlipCardPayload(payload.payload),
        };

      default:
        throw new BadRequestException(`Unsupported reading command "${payload.type}".`);
    }
  }

  private parseCanvasModePayload(payload: unknown): LegacySwitchCanvasModePayload {
    if (
      !payload ||
      Array.isArray(payload) ||
      typeof payload !== "object" ||
      !("canvasMode" in payload)
    ) {
      throw new BadRequestException("switch_canvas_mode payload requires a canvasMode.");
    }

    const { canvasMode } = payload as { canvasMode?: unknown };
    if (canvasMode !== "freeform" && canvasMode !== "grid") {
      throw new BadRequestException("switch_canvas_mode canvasMode must be freeform or grid.");
    }

    return { canvasMode };
  }

  private parseMoveCardPayload(payload: unknown): MoveCardPayload {
    if (!payload || Array.isArray(payload) || typeof payload !== "object") {
      throw new BadRequestException("move_card payload must be an object.");
    }

    const { cardId, freeform, grid } = payload as {
      cardId?: unknown;
      freeform?: { xPx?: unknown; yPx?: unknown };
      grid?: { column?: unknown; row?: unknown };
    };

    if (typeof cardId !== "string" || cardId.trim().length === 0) {
      throw new BadRequestException("move_card payload requires a cardId.");
    }

    const normalizedFreeform =
      freeform &&
      typeof freeform.xPx === "number" &&
      Number.isFinite(freeform.xPx) &&
      typeof freeform.yPx === "number" &&
      Number.isFinite(freeform.yPx)
        ? {
            xPx: Math.round(freeform.xPx),
            yPx: Math.round(freeform.yPx),
          }
        : grid &&
            typeof grid.column === "number" &&
            Number.isFinite(grid.column) &&
            typeof grid.row === "number" &&
            Number.isFinite(grid.row)
          ? resolveLegacyGridFreeformPosition({
              column: Math.round(grid.column),
              row: Math.round(grid.row),
            })
          : undefined;

    if (!normalizedFreeform) {
      throw new BadRequestException("move_card payload requires freeform coordinates.");
    }

    return {
      cardId,
      freeform: {
        xPx: normalizedFreeform.xPx,
        yPx: normalizedFreeform.yPx,
      },
    };
  }

  private parseRotateCardPayload(payload: unknown): RotateCardPayload {
    if (!payload || Array.isArray(payload) || typeof payload !== "object") {
      throw new BadRequestException("rotate_card payload must be an object.");
    }

    const { cardId, deltaDeg } = payload as { cardId?: unknown; deltaDeg?: unknown };
    if (typeof cardId !== "string" || cardId.trim().length === 0) {
      throw new BadRequestException("rotate_card payload requires a cardId.");
    }

    if (typeof deltaDeg !== "number" || !Number.isFinite(deltaDeg)) {
      throw new BadRequestException("rotate_card payload requires a numeric deltaDeg.");
    }

    return {
      cardId,
      deltaDeg: Math.round(deltaDeg),
    };
  }

  private parseFlipCardPayload(payload: unknown): FlipCardPayload {
    if (!payload || Array.isArray(payload) || typeof payload !== "object") {
      throw new BadRequestException("flip_card payload must be an object.");
    }

    const { cardId } = payload as { cardId?: unknown };
    if (typeof cardId !== "string" || cardId.trim().length === 0) {
      throw new BadRequestException("flip_card payload requires a cardId.");
    }

    return {
      cardId,
    };
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
