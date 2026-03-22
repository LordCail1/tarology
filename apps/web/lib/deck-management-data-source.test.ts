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
  knowledgeVersion: 1,
  initializationMode: "starter_content" as const,
  initializerKey: "thoth",
  previewImageUrl: "/images/cards/thoth/TheSun.jpg",
  backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
  cardCount: 78,
  symbolCount: 8,
};

const ownedThothSummary = {
  ...thothSummary,
  id: "deck_owned_thoth_123",
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

  it("builds the starter deck snapshot for owned Thoth deck instances", async () => {
    const dataSource = createLocalDeckManagementDataSource(undefined, "usr_123");

    const snapshot = await dataSource.loadLibrary([ownedThothSummary], ownedThothSummary.id);

    expect(snapshot.activeDeckId).toBe(ownedThothSummary.id);
    expect(snapshot.decks).toHaveLength(1);
    expect(snapshot.decks[0].id).toBe(ownedThothSummary.id);
    expect(snapshot.decks[0].cards).toHaveLength(78);
    expect(snapshot.decks[0].symbols.length).toBeGreaterThan(0);
    expect(snapshot.decks[0].cardInformationEntries.length).toBeGreaterThan(78);
    expect(snapshot.decks[0].knowledgeSources).toHaveLength(2);
  });

  it("repairs previously persisted empty owned starter deck snapshots", async () => {
    const storage = window.localStorage;
    storage.setItem(
      buildDeckLibraryStorageKey("usr_123"),
      JSON.stringify({
        activeDeckId: ownedThothSummary.id,
        decks: [
          {
            ...ownedThothSummary,
            knowledgeVersion: 0,
            initializationMode: "empty_template",
            initializerKey: null,
            originExportDigest: null,
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
    const snapshot = await dataSource.loadLibrary([ownedThothSummary], ownedThothSummary.id);
    const persistedSnapshot = JSON.parse(
      storage.getItem(buildDeckLibraryStorageKey("usr_123")) ?? "null"
    ) as { decks: Array<{ cards: unknown[]; symbols: unknown[] }> } | null;

    expect(snapshot.activeDeckId).toBe(ownedThothSummary.id);
    expect(snapshot.decks[0].id).toBe(ownedThothSummary.id);
    expect(snapshot.decks[0].cards).toHaveLength(78);
    expect(snapshot.decks[0].symbols.length).toBeGreaterThan(0);
    expect(snapshot.decks[0].knowledgeSources).toHaveLength(2);
    expect(persistedSnapshot?.decks[0]?.cards).toHaveLength(78);
    expect(persistedSnapshot?.decks[0]?.symbols.length).toBeGreaterThan(0);
    storage.clear();
  });

  it("keeps the repaired library in memory when repair write-back fails", async () => {
    const persistedValue = JSON.stringify({
      activeDeckId: ownedThothSummary.id,
      decks: [
        {
          ...ownedThothSummary,
          knowledgeVersion: 0,
          initializationMode: "empty_template" as const,
          initializerKey: null,
          originExportDigest: null,
          symbolCount: 0,
          cards: [],
          symbols: [],
          cardSymbols: [],
          knowledgeSources: [],
          cardInformationEntries: [],
          symbolInformationEntries: [],
        },
      ],
    });

    const storage = {
      getItem(key: string) {
        return key === buildDeckLibraryStorageKey("usr_123") ? persistedValue : null;
      },
      setItem() {
        throw new Error("quota exceeded");
      },
      removeItem() {},
      clear() {},
      key() {
        return null;
      },
      length: 1,
    } as Storage;

    const dataSource = createLocalDeckManagementDataSource(storage, "usr_123");
    const snapshot = await dataSource.loadLibrary([ownedThothSummary], ownedThothSummary.id);

    expect(snapshot.activeDeckId).toBe(ownedThothSummary.id);
    expect(snapshot.decks[0].id).toBe(ownedThothSummary.id);
    expect(snapshot.decks[0].cards).toHaveLength(78);
    expect(snapshot.decks[0].symbols.length).toBeGreaterThan(0);
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
