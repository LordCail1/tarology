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

  it("derives imported cardCount from the cards payload when export metadata is stale", () => {
    const deck = createThothStarterDeck(thothSummary);
    const document = {
      ...buildDeckExportDocument(deck),
      deck: {
        ...buildDeckExportDocument(deck).deck,
        cardCount: 12,
      },
    };

    const snapshot = importDeckFromDocument(document, {
      activeDeckId: deck.id,
      decks: [deck],
    });

    expect(snapshot.decks.at(-1)?.cardCount).toBe(document.cards.length);
  });

  it("preserves imported json knowledge entries for later export", () => {
    const deck = createThothStarterDeck(thothSummary);
    const baseDocument = buildDeckExportDocument(deck);
    const cardId = baseDocument.cards[0]?.cardId ?? "major:the-fool";
    const jsonBody = {
      motif: "sun-disk",
      tones: ["clarity", "heat"],
    };
    const document = {
      ...baseDocument,
      cardInformationEntries: [
        ...baseDocument.cardInformationEntries,
        {
          entryId: "json-outline",
          cardId,
          label: "json-outline",
          format: "json" as const,
          summary: "Structured import payload",
          sourceIds: [],
          sortOrder: 99,
          bodyJson: jsonBody,
        },
      ],
    };

    const snapshot = importDeckFromDocument(document, {
      activeDeckId: deck.id,
      decks: [deck],
    });
    const importedDeck = snapshot.decks.at(-1);
    const importedEntry = importedDeck?.cardInformationEntries.find(
      (entry) => entry.entryId === "json-outline"
    );

    expect(importedEntry?.format).toBe("json");
    expect(importedEntry?.bodyJson).toEqual(jsonBody);

    const roundTrippedDocument = buildDeckExportDocument(importedDeck!);
    const roundTrippedEntry = roundTrippedDocument.cardInformationEntries.find(
      (entry) => entry.entryId === "json-outline"
    );

    expect(roundTrippedEntry?.format).toBe("json");
    expect(roundTrippedEntry?.bodyJson).toEqual(jsonBody);
  });

  it("round-trips archived entry state through export and import", () => {
    const deck = createThothStarterDeck(thothSummary);
    const archivedAt = "2026-03-15T18:00:00.000Z";

    deck.cardInformationEntries[0] = {
      ...deck.cardInformationEntries[0],
      archivedAt,
    };

    const document = buildDeckExportDocument(deck);
    const exportedEntry = document.cardInformationEntries.find(
      (entry) => entry.entryId === deck.cardInformationEntries[0]?.entryId
    );

    expect(exportedEntry?.archivedAt).toBe(archivedAt);

    const snapshot = importDeckFromDocument(document, {
      activeDeckId: deck.id,
      decks: [deck],
    });
    const importedEntry = snapshot.decks
      .at(-1)
      ?.cardInformationEntries.find((entry) => entry.entryId === deck.cardInformationEntries[0]?.entryId);

    expect(importedEntry?.archivedAt).toBe(archivedAt);
  });

  it("round-trips entry tags through export and import", () => {
    const deck = createThothStarterDeck(thothSummary);

    deck.cardInformationEntries[0] = {
      ...deck.cardInformationEntries[0],
      tags: ["starter", "focus"],
    };

    const document = buildDeckExportDocument(deck);
    const exportedEntry = document.cardInformationEntries.find(
      (entry) => entry.entryId === deck.cardInformationEntries[0]?.entryId
    );

    expect(exportedEntry?.tags).toEqual(["starter", "focus"]);

    const snapshot = importDeckFromDocument(document, {
      activeDeckId: deck.id,
      decks: [deck],
    });
    const importedEntry = snapshot.decks
      .at(-1)
      ?.cardInformationEntries.find((entry) => entry.entryId === deck.cardInformationEntries[0]?.entryId);

    expect(importedEntry?.tags).toEqual(["starter", "focus"]);
  });

  it("normalizes imported entry sourceIds to string arrays", () => {
    const deck = createThothStarterDeck(thothSummary);
    const baseDocument = buildDeckExportDocument(deck);
    const firstCardEntryId = baseDocument.cardInformationEntries[0]?.entryId;
    const firstSymbolEntryId = baseDocument.symbolInformationEntries[0]?.entryId;
    const document = {
      ...baseDocument,
      cardInformationEntries: baseDocument.cardInformationEntries.map((entry, index) =>
        index === 0
          ? {
              ...entry,
              sourceIds: ["starter:thoth-bundle", 42, null] as unknown as string[],
            }
          : entry
      ),
      symbolInformationEntries: baseDocument.symbolInformationEntries.map((entry, index) =>
        index === 0
          ? {
              ...entry,
              sourceIds: undefined as unknown as string[],
            }
          : entry
      ),
    };

    const snapshot = importDeckFromDocument(document, {
      activeDeckId: deck.id,
      decks: [deck],
    });
    const importedDeck = snapshot.decks.at(-1);
    const importedCardEntry = importedDeck?.cardInformationEntries.find(
      (entry) => entry.entryId === firstCardEntryId
    );
    const importedSymbolEntry = importedDeck?.symbolInformationEntries.find(
      (entry) => entry.entryId === firstSymbolEntryId
    );

    expect(importedCardEntry?.sourceIds).toEqual(["starter:thoth-bundle"]);
    expect(importedSymbolEntry?.sourceIds).toEqual([]);
  });
});
