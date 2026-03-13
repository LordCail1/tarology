import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service.js";

type ReadingTransaction = Prisma.TransactionClient;

@Injectable()
export class ReadingEventsRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async append(
    tx: ReadingTransaction,
    input: {
      id: string;
      readingId: string;
      ownerUserId: string;
      version: number;
      eventType: string;
      payload: Prisma.InputJsonValue;
      commandId: string | null;
      idempotencyKey: string | null;
      createdAt: Date;
    }
  ): Promise<void> {
    await tx.readingEvent.create({
      data: {
        id: input.id,
        readingId: input.readingId,
        ownerUserId: input.ownerUserId,
        version: input.version,
        eventType: input.eventType,
        payload: input.payload,
        commandId: input.commandId,
        idempotencyKey: input.idempotencyKey,
        createdAt: input.createdAt,
      },
    });
  }

  async listAfterVersion(readingId: string, version: number) {
    return this.prisma.readingEvent.findMany({
      where: {
        readingId,
        version: {
          gt: version,
        },
      },
      orderBy: {
        version: "asc",
      },
    });
  }
}
