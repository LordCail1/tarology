import { describe, expect, it } from "vitest";
import {
  buildDeckLibraryStorageKey,
  createLocalDeckManagementDataSource,
} from "./deck-management-data-source";

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
    const dataSource = createLocalDeckManagementDataSource(undefined, "usr_123");

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
      buildDeckLibraryStorageKey("usr_123"),
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

    const dataSource = createLocalDeckManagementDataSource(storage, "usr_123");
    const snapshot = await dataSource.loadLibrary([thothSummary], "thoth");

    expect(snapshot.activeDeckId).toBe("imported-1");
    expect(snapshot.decks[0].id).toBe("imported-1");
    storage.clear();
  });

  it("repairs a persisted snapshot whose active deck id no longer exists", async () => {
    const storage = window.localStorage;
    storage.setItem(
      buildDeckLibraryStorageKey("usr_123"),
      JSON.stringify({
        activeDeckId: "missing-deck",
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

    const dataSource = createLocalDeckManagementDataSource(storage, "usr_123");
    const snapshot = await dataSource.loadLibrary([thothSummary], "thoth");

    expect(snapshot.activeDeckId).toBe("imported-1");
    expect(snapshot.decks[0].id).toBe("imported-1");
    storage.clear();
  });

  it("keeps one reader's local deck library isolated from another reader on the same browser", async () => {
    const storage = window.localStorage;
    storage.setItem(
      buildDeckLibraryStorageKey("usr_123"),
      JSON.stringify({
        activeDeckId: "reader-one-deck",
        decks: [
          {
            ...thothSummary,
            id: "reader-one-deck",
            knowledgeVersion: 2,
            initializationMode: "imported_clone",
            initializerKey: null,
            originExportDigest: "digest:one",
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

    const readerTwoDataSource = createLocalDeckManagementDataSource(storage, "usr_456");
    const snapshot = await readerTwoDataSource.loadLibrary([thothSummary], "thoth");

    expect(snapshot.activeDeckId).toBe("thoth");
    expect(snapshot.decks[0].id).toBe("thoth");
    storage.clear();
  });

  it("falls back to the seeded snapshot when persisted deck data is structurally incomplete", async () => {
    const storage = window.localStorage;
    storage.setItem(
      buildDeckLibraryStorageKey("usr_123"),
      JSON.stringify({
        activeDeckId: "corrupted-deck",
        decks: [
          {
            ...thothSummary,
            id: "corrupted-deck",
            knowledgeVersion: 1,
            initializationMode: "imported_clone",
            initializerKey: null,
            originExportDigest: "digest:bad",
            symbolCount: 0,
            cards: null,
            symbols: [],
            cardSymbols: [],
            knowledgeSources: [],
            cardInformationEntries: [],
            symbolInformationEntries: [],
          },
        ],
      })
    );

    const dataSource = createLocalDeckManagementDataSource(storage, "usr_123");
    const snapshot = await dataSource.loadLibrary([thothSummary], "thoth");

    expect(snapshot.activeDeckId).toBe("thoth");
    expect(snapshot.decks[0].id).toBe("thoth");
    expect(snapshot.decks[0].cards).toHaveLength(78);
    storage.clear();
  });
});
