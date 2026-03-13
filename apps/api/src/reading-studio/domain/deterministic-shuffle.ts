import { createHash, randomBytes } from "node:crypto";
import {
  SHUFFLE_ALGORITHM_VERSION,
  TOTAL_TAROT_CARDS,
  type CardAssignment,
} from "@tarology/shared";

interface BuiltAssignment {
  assignments: CardAssignment[];
  seedCommitment: string;
  orderHash: string;
  shuffleAlgorithmVersion: string;
}

function createDeterministicRng(seed: Buffer) {
  let counter = 0;
  let buffer = Buffer.alloc(0);
  let offset = 0;

  function refill() {
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));
    buffer = createHash("sha256").update(seed).update(counterBuffer).digest();
    offset = 0;
    counter += 1;
  }

  function nextUint32(): number {
    if (offset + 4 > buffer.length) {
      refill();
    }
    const value = buffer.readUInt32BE(offset);
    offset += 4;
    return value;
  }

  function nextInt(maxExclusive: number): number {
    if (maxExclusive <= 0) {
      throw new Error("maxExclusive must be greater than 0.");
    }
    const maxUint32 = 0x100000000;
    const limit = Math.floor(maxUint32 / maxExclusive) * maxExclusive;
    let candidate = nextUint32();
    while (candidate >= limit) {
      candidate = nextUint32();
    }
    return candidate % maxExclusive;
  }

  return {
    nextInt,
  };
}

function buildOrderHash(assignments: CardAssignment[]): string {
  const compact = assignments
    .map((assignment) =>
      `${assignment.deckIndex}:${assignment.cardId}:${assignment.assignedReversal ? 1 : 0}`
    )
    .join("|");
  return createHash("sha256").update(compact).digest("hex");
}

export function buildDeterministicCardAssignment(cardIds: readonly string[]): BuiltAssignment {
  const seed = randomBytes(32);
  const seedCommitment = createHash("sha256").update(seed).digest("hex");
  const rng = createDeterministicRng(seed);

  if (cardIds.length !== TOTAL_TAROT_CARDS) {
    throw new Error(`Expected ${TOTAL_TAROT_CARDS} cards, received ${cardIds.length}.`);
  }

  const orderedCardIds = [...cardIds];

  for (let index = orderedCardIds.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.nextInt(index + 1);
    const current = orderedCardIds[index];
    orderedCardIds[index] = orderedCardIds[swapIndex];
    orderedCardIds[swapIndex] = current;
  }

  const assignments: CardAssignment[] = orderedCardIds.map((cardId, deckIndex) => ({
    deckIndex,
    cardId,
    assignedReversal: rng.nextInt(2) === 1,
  }));

  return {
    assignments,
    seedCommitment,
    orderHash: buildOrderHash(assignments),
    shuffleAlgorithmVersion: SHUFFLE_ALGORITHM_VERSION,
  };
}
