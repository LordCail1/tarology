import { Inject, Injectable } from "@nestjs/common";
import type { Prisma, Reading } from "@prisma/client";
import type { ReadingListStatusFilter } from "@tarology/shared";
import { PrismaService } from "../../database/prisma.service.js";

type ReadingTransaction = Prisma.TransactionClient;

export interface CreateReadingRecordInput {
  id: string;
  ownerUserId: string;
  rootQuestion: string;
  deckId: string | null;
  deckSpecVersion: string;
  shuffleAlgorithmVersion: string;
  seedCommitment: string;
  orderHash: string;
  canvasMode: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  deletedAt: Date | null;
  cards: Array<{
    deckIndex: number;
    cardId: string;
    assignedReversal: boolean;
    createdAt: Date;
  }>;
}

@Injectable()
export class ReadingsRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async create(
    tx: ReadingTransaction,
    input: CreateReadingRecordInput
  ): Promise<void> {
    await tx.reading.create({
      data: {
        id: input.id,
        ownerUserId: input.ownerUserId,
        rootQuestion: input.rootQuestion,
        status: "active",
        deckId: input.deckId,
        deckSpecVersion: input.deckSpecVersion,
        shuffleAlgorithmVersion: input.shuffleAlgorithmVersion,
        seedCommitment: input.seedCommitment,
        orderHash: input.orderHash,
        canvasMode: input.canvasMode,
        version: input.version,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
        archivedAt: input.archivedAt,
        deletedAt: input.deletedAt,
      },
    });

    await tx.readingCard.createMany({
      data: input.cards.map((card) => ({
        readingId: input.id,
        deckIndex: card.deckIndex,
        cardId: card.cardId,
        assignedReversal: card.assignedReversal,
        createdAt: card.createdAt,
      })),
    });
  }

  async findOwnedById(
    ownerUserId: string,
    readingId: string,
    includeDeleted = false
  ) {
    return this.prisma.reading.findFirst({
      where: {
        id: readingId,
        ownerUserId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: {
        cards: {
          orderBy: { deckIndex: "asc" },
        },
      },
    });
  }

  async findCurrentById(readingId: string) {
    return this.prisma.reading.findUnique({
      where: { id: readingId },
      include: {
        cards: {
          orderBy: { deckIndex: "asc" },
        },
      },
    });
  }

  async listOwned(ownerUserId: string, status: ReadingListStatusFilter) {
    return this.prisma.reading.findMany({
      where: {
        ownerUserId,
        deletedAt: null,
        ...(status === "all" ? {} : { status }),
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async updateLifecycle(
    tx: ReadingTransaction,
    input: {
      readingId: string;
      ownerUserId: string;
      expectedVersion: number;
      status: string;
      version: number;
      updatedAt: Date;
      archivedAt: Date | null;
      deletedAt: Date | null;
    }
  ): Promise<number> {
    const result = await tx.reading.updateMany({
      where: {
        id: input.readingId,
        ownerUserId: input.ownerUserId,
        version: input.expectedVersion,
      },
      data: {
        status: input.status,
        version: input.version,
        updatedAt: input.updatedAt,
        archivedAt: input.archivedAt,
        deletedAt: input.deletedAt,
      },
    });

    return result.count;
  }

  async findCurrentVersion(ownerUserId: string, readingId: string): Promise<Reading | null> {
    return this.prisma.reading.findFirst({
      where: {
        id: readingId,
        ownerUserId,
      },
    });
  }
}
