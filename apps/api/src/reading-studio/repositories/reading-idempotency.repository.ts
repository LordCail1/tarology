import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service.js";

type ReadingTransaction = Prisma.TransactionClient;

@Injectable()
export class ReadingIdempotencyRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async findCreateReceipt(ownerUserId: string, idempotencyKey: string) {
    return this.prisma.readingCreateReceipt.findUnique({
      where: {
        ownerUserId_idempotencyKey: {
          ownerUserId,
          idempotencyKey,
        },
      },
    });
  }

  async createCreateReceipt(
    tx: ReadingTransaction,
    input: {
      id: string;
      ownerUserId: string;
      idempotencyKey: string;
      requestHash: string;
      readingId: string;
      responseJson: Prisma.InputJsonValue;
      createdAt: Date;
    }
  ): Promise<void> {
    await tx.readingCreateReceipt.create({
      data: {
        id: input.id,
        ownerUserId: input.ownerUserId,
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        readingId: input.readingId,
        responseJson: input.responseJson,
        createdAt: input.createdAt,
      },
    });
  }

  async findCommandReceiptByIdempotencyKey(
    readingId: string,
    idempotencyKey: string
  ) {
    return this.prisma.readingCommandReceipt.findUnique({
      where: {
        readingId_idempotencyKey: {
          readingId,
          idempotencyKey,
        },
      },
    });
  }

  async findCommandReceiptByCommandId(readingId: string, commandId: string) {
    return this.prisma.readingCommandReceipt.findUnique({
      where: {
        readingId_commandId: {
          readingId,
          commandId,
        },
      },
    });
  }

  async createCommandReceipt(
    tx: ReadingTransaction,
    input: {
      id: string;
      readingId: string;
      ownerUserId: string;
      commandId: string;
      idempotencyKey: string;
      requestHash: string;
      resultingVersion: number;
      responseJson: Prisma.InputJsonValue;
      createdAt: Date;
    }
  ): Promise<void> {
    await tx.readingCommandReceipt.create({
      data: {
        id: input.id,
        readingId: input.readingId,
        ownerUserId: input.ownerUserId,
        commandId: input.commandId,
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        resultingVersion: input.resultingVersion,
        responseJson: input.responseJson,
        createdAt: input.createdAt,
      },
    });
  }
}
