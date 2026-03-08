import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { CreateReadingResponse } from "@tarology/shared";
import { buildDeterministicCardAssignment } from "./domain/deterministic-shuffle.js";
import { CreateReadingDto } from "./dto/create-reading.dto.js";

@Injectable()
export class ReadingsService {
  private readonly readings = new Map<string, CreateReadingResponse>();

  createReading(payload: CreateReadingDto): CreateReadingResponse {
    const builtAssignment = buildDeterministicCardAssignment();
    const readingId = randomUUID();

    const reading: CreateReadingResponse = {
      readingId,
      rootQuestion: payload.rootQuestion,
      deckSpecVersion: payload.deckSpecVersion,
      shuffleAlgorithmVersion: builtAssignment.shuffleAlgorithmVersion,
      seedCommitment: builtAssignment.seedCommitment,
      orderHash: builtAssignment.orderHash,
      assignments: builtAssignment.assignments,
      createdAt: new Date().toISOString(),
    };

    this.readings.set(readingId, reading);
    return reading;
  }
}

