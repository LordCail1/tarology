import { describe, expect, it } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { StarterDeckTemplatesService } from "../src/knowledge/starter-deck-templates.service.js";

describe("StarterDeckTemplatesService", () => {
  const service = new StarterDeckTemplatesService();

  it("builds substantial starter content for the Thoth deck", () => {
    const seed = service.getStarterDeckSeed("thoth");

    expect(seed.initializationMode).toBe("starter_content");
    expect(seed.deckSpecVersion).toBe("thoth-v1");
    expect(seed.cards).toHaveLength(78);
    expect(seed.symbols.length).toBeGreaterThan(0);
    expect(seed.cardSymbols.length).toBeGreaterThan(0);
    expect(seed.knowledgeSources).toHaveLength(1);
    expect(seed.cardInformationEntries.length).toBe(seed.cards.length * 3);
    expect(seed.symbolInformationEntries.length).toBe(seed.symbols.length);
  });

  it("builds an empty Thoth template without starter knowledge", () => {
    const seed = service.getEmptyTemplateSeed("thoth");

    expect(seed.initializationMode).toBe("empty_template");
    expect(seed.deckSpecVersion).toBe("thoth-v1");
    expect(seed.cards).toHaveLength(78);
    expect(seed.symbols).toEqual([]);
    expect(seed.cardSymbols).toEqual([]);
    expect(seed.knowledgeSources).toEqual([]);
    expect(seed.cardInformationEntries).toEqual([]);
    expect(seed.symbolInformationEntries).toEqual([]);
  });

  it("rejects unknown starter keys", () => {
    expect(() => service.getStarterDeckSeed("unknown")).toThrow(NotFoundException);
    expect(() => service.getEmptyTemplateSeed("unknown")).toThrow(NotFoundException);
  });
});
