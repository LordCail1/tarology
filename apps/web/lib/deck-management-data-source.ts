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

function isEmptyPersistedDeckShell(deck: DeckLibrarySnapshot["decks"][number]): boolean {
  return (
    deck.cards.length === 0 &&
    deck.symbols.length === 0 &&
    deck.cardSymbols.length === 0 &&
    deck.knowledgeSources.length === 0 &&
    deck.cardInformationEntries.length === 0 &&
    deck.symbolInformationEntries.length === 0
  );
}

function repairPersistedSnapshot(
  snapshot: DeckLibrarySnapshot,
  deckSummaries: DeckSummary[]
): { snapshot: DeckLibrarySnapshot; changed: boolean } {
  const summaryById = new Map(deckSummaries.map((summary) => [summary.id, summary]));
  let changed = false;

  const repairedDecks = snapshot.decks.map((deck) => {
    const summary = summaryById.get(deck.id);
    if (!summary) {
      return deck;
    }

    const seededDeck = createDeckFromSummary(summary);
    if (!isEmptyPersistedDeckShell(deck) || seededDeck.cards.length === 0) {
      return deck;
    }

    changed = true;
    return seededDeck;
  });

  const normalizedSnapshot = normalizeSnapshot({
    activeDeckId: snapshot.activeDeckId,
    decks: repairedDecks,
  });

  if (
    !changed &&
    normalizedSnapshot.activeDeckId === snapshot.activeDeckId &&
    normalizedSnapshot.decks.every((deck, index) => deck === snapshot.decks[index])
  ) {
    return {
      snapshot,
      changed: false,
    };
  }

  return {
    snapshot: normalizedSnapshot,
    changed: true,
  };
}

function isValidDeckArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isValidPersistedDeck(deck: unknown): deck is DeckLibrarySnapshot["decks"][number] {
  if (!deck || typeof deck !== "object") {
    return false;
  }

  const candidate = deck as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.cardCount === "number" &&
    typeof candidate.knowledgeVersion === "number" &&
    typeof candidate.symbolCount === "number" &&
    isValidDeckArray(candidate.cards) &&
    isValidDeckArray(candidate.symbols) &&
    isValidDeckArray(candidate.cardSymbols) &&
    isValidDeckArray(candidate.knowledgeSources) &&
    isValidDeckArray(candidate.cardInformationEntries) &&
    isValidDeckArray(candidate.symbolInformationEntries)
  );
}

function isValidPersistedSnapshot(value: unknown): value is DeckLibrarySnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.activeDeckId === "string" &&
    Array.isArray(candidate.decks) &&
    candidate.decks.length > 0 &&
    candidate.decks.every(isValidPersistedDeck)
  );
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

        const parsed = JSON.parse(rawValue) as unknown;
        if (!isValidPersistedSnapshot(parsed)) {
          return fallback;
        }

        const repaired = repairPersistedSnapshot(
          {
            activeDeckId: parsed.activeDeckId,
            decks: parsed.decks,
          },
          deckSummaries
        );

        if (repaired.changed) {
          try {
            storage.setItem(storageKey, JSON.stringify(repaired.snapshot));
          } catch {
            // Ignore repair write failures and keep the loaded snapshot in memory.
          }
        }

        return cloneSnapshot(repaired.snapshot);
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
