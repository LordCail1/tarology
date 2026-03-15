import { describe, expect, it } from "vitest";
import { createThothStarterDeck } from "./deck-management-thoth";
import { buildDeckExportDocument, importDeckFromDocument } from "./deck-management-export";

const thothSummary = {
  id: "thoth",
  name: "Thoth Tarot",
  description: "Starter deck",
  specVersion: "thoth-v1",
  previewImageUrl: "/images/cards/thoth/TheSun.jpg",
  backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
  cardCount: 78,
};

describe("deck export/import helpers", () => {
  it("builds an export document that preserves portable identifiers and starter content", () => {
    const deck = createThothStarterDeck(thothSummary);

    const document = buildDeckExportDocument(deck);

    expect(document.format).toBe("tarology.deck.export");
    expect(document.version).toBe(1);
    expect(document.cards).toHaveLength(78);
    expect(document.symbols.length).toBeGreaterThan(0);
    expect(document.cardInformationEntries.length).toBeGreaterThan(78);
    expect(document.knowledgeSources.map((source) => source.sourceId)).toContain(
      "starter:thoth-bundle"
    );
  });

  it("imports a deck document into a new owned local deck instance", () => {
    const deck = createThothStarterDeck(thothSummary);
    const document = buildDeckExportDocument(deck);

    const snapshot = importDeckFromDocument(document, {
      activeDeckId: deck.id,
      decks: [deck],
    });

    const importedDeck = snapshot.decks.at(-1);

    expect(snapshot.decks).toHaveLength(2);
    expect(snapshot.activeDeckId).toBe(importedDeck?.id);
    expect(importedDeck?.id).not.toBe(deck.id);
    expect(importedDeck?.initializationMode).toBe("imported_clone");
    expect(importedDeck?.cardCount).toBe(78);
    expect(importedDeck?.symbols.length).toBeGreaterThan(0);
    expect(importedDeck?.originExportDigest).toMatch(/^digest:/);
  });
});
