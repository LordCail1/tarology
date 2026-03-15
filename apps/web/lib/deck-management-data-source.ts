import type { DeckSummary } from "@tarology/shared";
import { cloneDeckLibraryDeck, createDeckFromSummary } from "./deck-management-thoth";
import type { DeckLibrarySnapshot } from "./deck-management-types";

export const DECK_LIBRARY_STORAGE_KEY = "tarology.ui.deckLibrary.v1";
export function buildDeckLibraryStorageKey(userId: string): string {
  return `${DECK_LIBRARY_STORAGE_KEY}:${userId}`;
}

function normalizeSnapshot(snapshot: DeckLibrarySnapshot): DeckLibrarySnapshot {
  const activeDeckId = snapshot.decks.some((deck) => deck.id === snapshot.activeDeckId)
    ? snapshot.activeDeckId
    : snapshot.decks[0]?.id ?? "";

  return {
    activeDeckId,
    decks: snapshot.decks,
  };
}

function cloneSnapshot(snapshot: DeckLibrarySnapshot): DeckLibrarySnapshot {
  return {
    activeDeckId: snapshot.activeDeckId,
    decks: snapshot.decks.map((deck) => cloneDeckLibraryDeck(deck)),
  };
}

export interface DeckManagementDataSource {
  loadLibrary(deckSummaries: DeckSummary[], defaultDeckId: string | null): Promise<DeckLibrarySnapshot>;
  saveLibrary(snapshot: DeckLibrarySnapshot): Promise<void>;
}

export function createSeedDeckLibrarySnapshot(
  deckSummaries: DeckSummary[],
  defaultDeckId: string | null
): DeckLibrarySnapshot {
  const decks = deckSummaries.map((summary) => createDeckFromSummary(summary));

  return normalizeSnapshot({
    activeDeckId: defaultDeckId ?? "",
    decks,
  });
}

export function createLocalDeckManagementDataSource(
  storage: Storage | undefined,
  userId: string
): DeckManagementDataSource {
  const storageKey = buildDeckLibraryStorageKey(userId);

  return {
    async loadLibrary(
      deckSummaries: DeckSummary[],
      defaultDeckId: string | null
    ): Promise<DeckLibrarySnapshot> {
      const fallback = createSeedDeckLibrarySnapshot(deckSummaries, defaultDeckId);

      if (!storage) {
        return fallback;
      }

      try {
        const rawValue = storage.getItem(storageKey);
        if (!rawValue) {
          return fallback;
        }

        const parsed = JSON.parse(rawValue) as DeckLibrarySnapshot;
        if (!parsed.decks?.length) {
          return fallback;
        }

        return cloneSnapshot(
          normalizeSnapshot({
            activeDeckId: parsed.activeDeckId,
            decks: parsed.decks,
          })
        );
      } catch {
        return fallback;
      }
    },
    async saveLibrary(snapshot: DeckLibrarySnapshot): Promise<void> {
      if (!storage) {
        return;
      }

      try {
        storage.setItem(storageKey, JSON.stringify(snapshot));
      } catch {
        // Ignore storage write failures.
      }
    },
  };
}
