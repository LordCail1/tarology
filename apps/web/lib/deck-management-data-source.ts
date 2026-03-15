import type { DeckSummary } from "@tarology/shared";
import { cloneDeckLibraryDeck, createDeckFromSummary } from "./deck-management-thoth";
import type { DeckLibrarySnapshot } from "./deck-management-types";

export const DECK_LIBRARY_STORAGE_KEY = "tarology.ui.deckLibrary.v1";

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

function buildSeedSnapshot(
  deckSummaries: DeckSummary[],
  defaultDeckId: string | null
): DeckLibrarySnapshot {
  const decks = deckSummaries.map((summary) => createDeckFromSummary(summary));
  const activeDeckId =
    (defaultDeckId && decks.some((deck) => deck.id === defaultDeckId) ? defaultDeckId : null) ??
    decks[0]?.id ??
    "";

  return {
    activeDeckId,
    decks,
  };
}

export function createLocalDeckManagementDataSource(
  storage: Storage | undefined
): DeckManagementDataSource {
  return {
    async loadLibrary(
      deckSummaries: DeckSummary[],
      defaultDeckId: string | null
    ): Promise<DeckLibrarySnapshot> {
      const fallback = buildSeedSnapshot(deckSummaries, defaultDeckId);

      if (!storage) {
        return fallback;
      }

      try {
        const rawValue = storage.getItem(DECK_LIBRARY_STORAGE_KEY);
        if (!rawValue) {
          return fallback;
        }

        const parsed = JSON.parse(rawValue) as DeckLibrarySnapshot;
        if (!parsed.decks?.length) {
          return fallback;
        }

        const activeDeckId = parsed.decks.some((deck) => deck.id === parsed.activeDeckId)
          ? parsed.activeDeckId
          : fallback.activeDeckId;

        return cloneSnapshot({
          activeDeckId,
          decks: parsed.decks,
        });
      } catch {
        return fallback;
      }
    },
    async saveLibrary(snapshot: DeckLibrarySnapshot): Promise<void> {
      if (!storage) {
        return;
      }

      try {
        storage.setItem(DECK_LIBRARY_STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // Ignore storage write failures.
      }
    },
  };
}
