import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service.js";

type ReadingTransaction = Prisma.TransactionClient;

@Injectable()
export class ReadingSnapshotsRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async create(
    tx: ReadingTransaction,
    input: {
      id: string;
      readingId: string;
      version: number;
      projection: Prisma.InputJsonValue;
      createdAt: Date;
    }
  ): Promise<void> {
    await tx.readingSnapshot.create({
      data: {
        id: input.id,
        readingId: input.readingId,
        version: input.version,
        projection: input.projection,
        createdAt: input.createdAt,
      },
    });
  }

  async findLatest(readingId: string) {
    return this.prisma.readingSnapshot.findFirst({
      where: { readingId },
      orderBy: {
        version: "desc",
      },
    });
  }
}
