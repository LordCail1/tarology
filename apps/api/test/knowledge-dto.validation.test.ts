import { describe, expect, it } from "vitest";
import { validateSync } from "class-validator";
import { UpdateCardDto } from "../src/knowledge/dto/update-card.dto.js";
import { CreateSymbolDto } from "../src/knowledge/dto/create-symbol.dto.js";
import { UpdateSymbolDto } from "../src/knowledge/dto/update-symbol.dto.js";

describe("knowledge DTO validation", () => {
  it("rejects non-string linkedSymbolIds in UpdateCardDto", () => {
    const dto = Object.assign(new UpdateCardDto(), {
      linkedSymbolIds: [123],
    });

    const errors = validateSync(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: "linkedSymbolIds",
        }),
      ])
    );
  });

  it("rejects non-string linkedCardIds in CreateSymbolDto", () => {
    const dto = Object.assign(new CreateSymbolDto(), {
      deckId: "deck-owned-1",
      name: "Lantern",
      linkedCardIds: [123],
    });

    const errors = validateSync(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: "linkedCardIds",
        }),
      ])
    );
  });

  it("rejects non-string linkedCardIds in UpdateSymbolDto", () => {
    const dto = Object.assign(new UpdateSymbolDto(), {
      linkedCardIds: [123],
    });

    const errors = validateSync(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: "linkedCardIds",
        }),
      ])
    );
  });
});
