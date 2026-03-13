import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildDeterministicCardAssignment } from "../src/reading-studio/domain/deterministic-shuffle.js";
import { THOTH_DECK_SPEC } from "../src/reading-studio/domain/thoth-deck-spec.js";

describe("buildDeterministicCardAssignment", () => {
  it("assigns all Thoth cards exactly once with stable string ids", () => {
    const built = buildDeterministicCardAssignment(THOTH_DECK_SPEC.cardIds);

    expect(built.assignments).toHaveLength(78);
    expect(new Set(built.assignments.map((assignment) => assignment.cardId)).size).toBe(78);
    expect(
      built.assignments.every((assignment) => THOTH_DECK_SPEC.cardIds.includes(assignment.cardId))
    ).toBe(true);
    expect(
      built.assignments.every((assignment) => typeof assignment.cardId === "string")
    ).toBe(true);
  });

  it("hashes the shuffled order from string card ids plus reversal bits", () => {
    const built = buildDeterministicCardAssignment(THOTH_DECK_SPEC.cardIds);
    const compact = built.assignments
      .map((assignment) =>
        `${assignment.deckIndex}:${assignment.cardId}:${assignment.assignedReversal ? 1 : 0}`
      )
      .join("|");

    expect(built.orderHash).toBe(createHash("sha256").update(compact).digest("hex"));
  });
});
