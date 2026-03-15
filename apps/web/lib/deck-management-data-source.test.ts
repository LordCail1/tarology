import { describe, expect, it } from "vitest";
import { createLocalDeckManagementDataSource } from "./deck-management-data-source";

const thothSummary = {
  id: "thoth",
  name: "Thoth Tarot",
  description: "Starter deck",
  specVersion: "thoth-v1",
  previewImageUrl: "/images/cards/thoth/TheSun.jpg",
  backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
  cardCount: 78,
};

describe("createLocalDeckManagementDataSource", () => {
  it("builds a substantial starter deck snapshot from the real deck summary list", async () => {
    const dataSource = createLocalDeckManagementDataSource(undefined);

    const snapshot = await dataSource.loadLibrary([thothSummary], "thoth");

    expect(snapshot.activeDeckId).toBe("thoth");
    expect(snapshot.decks).toHaveLength(1);
    expect(snapshot.decks[0].cards).toHaveLength(78);
    expect(snapshot.decks[0].symbols.length).toBeGreaterThan(0);
    expect(snapshot.decks[0].cardInformationEntries.length).toBeGreaterThan(78);
    expect(snapshot.decks[0].knowledgeSources).toHaveLength(2);
  });

  it("restores a persisted snapshot when local storage already has one", async () => {
    const storage = window.localStorage;
    storage.setItem(
      "tarology.ui.deckLibrary.v1",
      JSON.stringify({
        activeDeckId: "imported-1",
        decks: [
          {
            ...thothSummary,
            id: "imported-1",
            knowledgeVersion: 3,
            initializationMode: "imported_clone",
            initializerKey: null,
            originExportDigest: "digest:abc",
            symbolCount: 0,
            cards: [],
            symbols: [],
            cardSymbols: [],
            knowledgeSources: [],
            cardInformationEntries: [],
            symbolInformationEntries: [],
          },
        ],
      })
    );

    const dataSource = createLocalDeckManagementDataSource(storage);
    const snapshot = await dataSource.loadLibrary([thothSummary], "thoth");

    expect(snapshot.activeDeckId).toBe("imported-1");
    expect(snapshot.decks[0].id).toBe("imported-1");
    storage.clear();
  });
});
