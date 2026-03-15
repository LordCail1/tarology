"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type { DeckSummary, ProfileShellDto, UserPreferencesDto } from "@tarology/shared";
import {
  createLocalDeckManagementDataSource,
  createSeedDeckLibrarySnapshot,
} from "../../lib/deck-management-data-source";
import { buildDeckExportDocument, importDeckFromDocument } from "../../lib/deck-management-export";
import { cloneDeckLibraryDeck } from "../../lib/deck-management-thoth";
import type {
  DeckCardEntry,
  DeckEditorSubject,
  DeckEntryFormat,
  DeckKnowledgeSource,
  DeckKnowledgeSourceKind,
  DeckLibraryDeck,
  DeckLibrarySnapshot,
  DeckSymbolEntry,
} from "../../lib/deck-management-types";

type LibraryTab = "cards" | "symbols";
type FlashTone = "success" | "error";

interface DeckManagementShellProps {
  profile: ProfileShellDto;
  preferences: UserPreferencesDto;
  availableDecks: DeckSummary[];
}

interface EntryDraft {
  label: string;
  format: DeckEntryFormat;
  bodyText: string;
  sourceId: string;
}

type EditableDeckEntry = (DeckCardEntry | DeckSymbolEntry) & { format: DeckEntryFormat };

interface SourceDraft {
  title: string;
  url: string;
  kind: DeckKnowledgeSourceKind;
}

function createPortableId(prefix: string): string {
  const token =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  return `${prefix}:${token}`;
}

function createNow(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createUniqueSourceId(deck: DeckLibraryDeck, title: string): string {
  const baseId = slugify(title) || createPortableId("source");
  let candidate = baseId;
  let suffix = 2;

  while (deck.knowledgeSources.some((source) => source.sourceId === candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function buildInitials(displayName: string): string {
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "TR";
}

function entryCountForCard(deck: DeckLibraryDeck, cardId: string): number {
  return deck.cardInformationEntries.filter((entry) => entry.cardId === cardId && !entry.archivedAt).length;
}

function entryCountForSymbol(deck: DeckLibraryDeck, symbolId: string): number {
  return deck.symbolInformationEntries.filter((entry) => entry.symbolId === symbolId && !entry.archivedAt).length;
}

function linkedSymbolsForCard(deck: DeckLibraryDeck, cardId: string) {
  const linkedIds = new Set(
    deck.cardSymbols.filter((link) => link.cardId === cardId).map((link) => link.symbolId)
  );

  return deck.symbols.filter((symbol) => linkedIds.has(symbol.symbolId));
}

function linkedCardsForSymbol(deck: DeckLibraryDeck, symbolId: string) {
  const linkedIds = new Set(
    deck.cardSymbols.filter((link) => link.symbolId === symbolId).map((link) => link.cardId)
  );

  return deck.cards.filter((card) => linkedIds.has(card.cardId));
}

function activeEntriesForSubject(
  deck: DeckLibraryDeck,
  subject: DeckEditorSubject | null
): Array<DeckCardEntry | DeckSymbolEntry> {
  if (!subject) {
    return [];
  }

  if (subject.kind === "card") {
    return deck.cardInformationEntries
      .filter((entry) => entry.cardId === subject.cardId && !entry.archivedAt)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  return deck.symbolInformationEntries
    .filter((entry) => entry.symbolId === subject.symbolId && !entry.archivedAt)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function isEditableEntry(entry: DeckCardEntry | DeckSymbolEntry): entry is EditableDeckEntry {
  return entry.format !== "json";
}

function entryBodyPreview(entry: DeckCardEntry | DeckSymbolEntry): string {
  return entry.format === "json" && entry.bodyJson
    ? JSON.stringify(entry.bodyJson, null, 2)
    : entry.bodyText;
}

function cloneDeck(deck: DeckLibraryDeck): DeckLibraryDeck {
  return cloneDeckLibraryDeck(deck);
}

function withKnowledgeVersion(deck: DeckLibraryDeck): DeckLibraryDeck {
  return {
    ...deck,
    knowledgeVersion: deck.knowledgeVersion + 1,
  };
}

function createEmptyDeckClone(deck: DeckLibraryDeck): DeckLibraryDeck {
  return {
    ...cloneDeck(deck),
    id: createPortableId("deck"),
    name: `${deck.name} Empty`,
    description: `Knowledge-empty clone of ${deck.name} for custom authorship.`,
    knowledgeVersion: 0,
    initializationMode: "empty_template",
    initializerKey: deck.initializerKey ? `${deck.initializerKey}:empty` : "template:empty",
    originExportDigest: null,
    symbolCount: 0,
    symbols: [],
    cardSymbols: [],
    knowledgeSources: [],
    cardInformationEntries: [],
    symbolInformationEntries: [],
  };
}

const buttonClass =
  "rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-white/[0.08]";
const primaryButtonClass =
  "rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-black transition hover:brightness-110";
const inputClass =
  "w-full rounded-lg border border-[var(--color-border)] bg-black/20 px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[#4c7cff]";

export function DeckManagementShell({
  profile,
  preferences,
  availableDecks,
}: DeckManagementShellProps) {
  const dataSource = useMemo(
    () =>
      createLocalDeckManagementDataSource(
        typeof window === "undefined" ? undefined : window.localStorage,
        profile.userId
      ),
    [profile.userId]
  );
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [snapshot, setSnapshot] = useState<DeckLibrarySnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<LibraryTab>("cards");
  const [selectedSubject, setSelectedSubject] = useState<DeckEditorSubject | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryDraft, setEntryDraft] = useState<EntryDraft>({
    label: "reader-note",
    format: "plain_text",
    bodyText: "",
    sourceId: "",
  });
  const [symbolDraft, setSymbolDraft] = useState({ name: "", description: "" });
  const [sourceDraft, setSourceDraft] = useState<SourceDraft>({
    title: "",
    url: "",
    kind: "manual_reference",
  });
  const [linkSymbolId, setLinkSymbolId] = useState("");
  const [flashMessage, setFlashMessage] = useState<{ tone: FlashTone; text: string } | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    async function loadLibrary() {
      const loadedSnapshot = await dataSource.loadLibrary(
        availableDecks,
        preferences.defaultDeckId
      );

      if (cancelled) {
        return;
      }

      setSnapshot(loadedSnapshot);
    }

    void loadLibrary();

    return () => {
      cancelled = true;
    };
  }, [availableDecks, dataSource, preferences.defaultDeckId]);

  async function persistSnapshot(nextSnapshot: DeckLibrarySnapshot) {
    setSnapshot(nextSnapshot);
    await dataSource.saveLibrary(nextSnapshot);
  }

  const selectedDeck =
    snapshot?.decks.find((deck) => deck.id === snapshot.activeDeckId) ??
    snapshot?.decks[0] ??
    null;

  useEffect(() => {
    if (!snapshot || !selectedDeck || snapshot.activeDeckId === selectedDeck.id) {
      return;
    }

    void persistSnapshot({
      ...snapshot,
      activeDeckId: selectedDeck.id,
    });
  }, [selectedDeck, snapshot]);

  const filteredCards = useMemo(() => {
    if (!selectedDeck) {
      return [];
    }

    const query = filterQuery.trim().toLowerCase();
    if (!query) {
      return selectedDeck.cards;
    }

    return selectedDeck.cards.filter(
      (card) =>
        card.name.toLowerCase().includes(query) ||
        card.cardId.toLowerCase().includes(query)
    );
  }, [filterQuery, selectedDeck]);

  const filteredSymbols = useMemo(() => {
    if (!selectedDeck) {
      return [];
    }

    const query = filterQuery.trim().toLowerCase();
    if (!query) {
      return selectedDeck.symbols;
    }

    return selectedDeck.symbols.filter(
      (symbol) =>
        symbol.name.toLowerCase().includes(query) ||
        symbol.symbolId.toLowerCase().includes(query)
    );
  }, [filterQuery, selectedDeck]);

  useEffect(() => {
    if (!selectedDeck) {
      return;
    }

    if (
      selectedSubject?.kind === "card" &&
      selectedDeck.cards.some((card) => card.cardId === selectedSubject.cardId)
    ) {
      return;
    }

    if (
      selectedSubject?.kind === "symbol" &&
      selectedDeck.symbols.some((symbol) => symbol.symbolId === selectedSubject.symbolId)
    ) {
      return;
    }

    if (activeTab === "cards" && selectedDeck.cards[0]) {
      setSelectedSubject({ kind: "card", cardId: selectedDeck.cards[0].cardId });
      return;
    }

    if (activeTab === "symbols" && selectedDeck.symbols[0]) {
      setSelectedSubject({ kind: "symbol", symbolId: selectedDeck.symbols[0].symbolId });
      return;
    }

    if (selectedDeck.cards[0]) {
      setSelectedSubject({ kind: "card", cardId: selectedDeck.cards[0].cardId });
      return;
    }

    setSelectedSubject(null);
  }, [activeTab, selectedDeck, selectedSubject]);

  const selectedCard =
    selectedDeck && selectedSubject?.kind === "card"
      ? selectedDeck.cards.find((card) => card.cardId === selectedSubject.cardId) ?? null
      : null;
  const selectedSymbol =
    selectedDeck && selectedSubject?.kind === "symbol"
      ? selectedDeck.symbols.find((symbol) => symbol.symbolId === selectedSubject.symbolId) ?? null
      : null;

  const selectedEntries = selectedDeck ? activeEntriesForSubject(selectedDeck, selectedSubject) : [];
  const availableSymbolsToLink =
    selectedDeck && selectedCard
      ? selectedDeck.symbols.filter(
          (symbol) =>
            !selectedDeck.cardSymbols.some(
              (link) => link.cardId === selectedCard.cardId && link.symbolId === symbol.symbolId
            )
        )
      : [];

  const linkedSymbols = selectedDeck && selectedCard ? linkedSymbolsForCard(selectedDeck, selectedCard.cardId) : [];
  const linkedCards = selectedDeck && selectedSymbol ? linkedCardsForSymbol(selectedDeck, selectedSymbol.symbolId) : [];

  function selectDeck(deckId: string) {
    if (!snapshot) {
      return;
    }

    void persistSnapshot({
      ...snapshot,
      activeDeckId: deckId,
    });
    setFilterQuery("");
    setEditingEntryId(null);
    setEntryDraft({
      label: "reader-note",
      format: "plain_text",
      bodyText: "",
      sourceId: "",
    });
  }

  function updateSelectedDeck(
    updater: (current: DeckLibraryDeck) => DeckLibraryDeck,
    options?: { nextSubject?: DeckEditorSubject | null; flash?: { tone: FlashTone; text: string } }
  ) {
    if (!snapshot || !selectedDeck) {
      return;
    }

    const nextDeck = updater(cloneDeck(selectedDeck));
    const nextSnapshot = {
      ...snapshot,
      decks: snapshot.decks.map((deck) => (deck.id === selectedDeck.id ? nextDeck : deck)),
    };

    void persistSnapshot(nextSnapshot);

    if (options?.nextSubject !== undefined) {
      setSelectedSubject(options.nextSubject);
    }

    if (options?.flash) {
      setFlashMessage(options.flash);
    }
  }

  function resetEntryDraft() {
    setEditingEntryId(null);
    setEntryDraft({
      label: "reader-note",
      format: "plain_text",
      bodyText: "",
      sourceId: "",
    });
  }

  function startEditingEntry(entry: DeckCardEntry | DeckSymbolEntry) {
    if (!isEditableEntry(entry)) {
      return;
    }

    setEditingEntryId(entry.id);
    setEntryDraft({
      label: entry.label,
      format: entry.format,
      bodyText: entry.bodyText,
      sourceId: entry.sourceIds[0] ?? "",
    });
  }

  function handleSaveEntry() {
    if (!selectedDeck || !selectedSubject || !entryDraft.bodyText.trim()) {
      return;
    }

    const editingEntryStillMatchesCurrentSubject =
      !editingEntryId ||
      (selectedSubject.kind === "card"
        ? selectedDeck.cardInformationEntries.some(
            (entry) =>
              entry.id === editingEntryId && entry.cardId === selectedSubject.cardId
          )
        : selectedDeck.symbolInformationEntries.some(
            (entry) =>
              entry.id === editingEntryId && entry.symbolId === selectedSubject.symbolId
          ));

    if (!editingEntryStillMatchesCurrentSubject) {
      resetEntryDraft();
      setFlashMessage({
        tone: "error",
        text: "Editing context changed. Start a new entry for the current selection.",
      });
      return;
    }

    const now = createNow();
    const entryIdBase = slugify(entryDraft.label) || "note";

    updateSelectedDeck(
      (currentDeck) => {
        const nextDeck = withKnowledgeVersion(currentDeck);
        const sourceIds = entryDraft.sourceId ? [entryDraft.sourceId] : [];

        if (selectedSubject.kind === "card") {
          const existingIndex = nextDeck.cardInformationEntries.findIndex(
            (entry) =>
              entry.id === editingEntryId && entry.cardId === selectedSubject.cardId
          );

          if (existingIndex >= 0) {
            nextDeck.cardInformationEntries[existingIndex] = {
              ...nextDeck.cardInformationEntries[existingIndex],
              label: entryDraft.label,
              format: entryDraft.format,
              bodyText: entryDraft.bodyText,
              bodyJson: null,
              sourceIds,
              summary: entryDraft.bodyText.slice(0, 96),
              updatedAt: now,
            };

            return nextDeck;
          }

          nextDeck.cardInformationEntries.push({
            id: createPortableId("entry"),
            entryId: entryIdBase,
            cardId: selectedSubject.cardId,
            label: entryDraft.label,
            format: entryDraft.format,
            bodyText: entryDraft.bodyText,
            bodyJson: null,
            summary: entryDraft.bodyText.slice(0, 96),
            tags: ["reader-note"],
            sourceIds,
            sortOrder:
              nextDeck.cardInformationEntries.filter((entry) => entry.cardId === selectedSubject.cardId)
                .length + 1,
            archivedAt: null,
            createdAt: now,
            updatedAt: now,
          });

          return nextDeck;
        }

        const existingIndex = nextDeck.symbolInformationEntries.findIndex(
          (entry) =>
            entry.id === editingEntryId && entry.symbolId === selectedSubject.symbolId
        );

        if (existingIndex >= 0) {
          nextDeck.symbolInformationEntries[existingIndex] = {
            ...nextDeck.symbolInformationEntries[existingIndex],
            label: entryDraft.label,
            format: entryDraft.format,
            bodyText: entryDraft.bodyText,
            bodyJson: null,
            sourceIds,
            summary: entryDraft.bodyText.slice(0, 96),
            updatedAt: now,
          };

          return nextDeck;
        }

        nextDeck.symbolInformationEntries.push({
          id: createPortableId("entry"),
          entryId: entryIdBase,
          symbolId: selectedSubject.symbolId,
          label: entryDraft.label,
          format: entryDraft.format,
          bodyText: entryDraft.bodyText,
          bodyJson: null,
          summary: entryDraft.bodyText.slice(0, 96),
          tags: ["reader-note"],
          sourceIds,
          sortOrder:
            nextDeck.symbolInformationEntries.filter((entry) => entry.symbolId === selectedSubject.symbolId)
              .length + 1,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        });

        return nextDeck;
      },
      {
        flash: {
          tone: "success",
          text: editingEntryId ? "Entry updated." : "Entry added.",
        },
      }
    );

    resetEntryDraft();
  }

  function handleArchiveEntry(entryId: string) {
    if (!selectedSubject) {
      return;
    }

    const archivedAt = createNow();

    updateSelectedDeck(
      (currentDeck) => {
        const nextDeck = withKnowledgeVersion(currentDeck);

        if (selectedSubject.kind === "card") {
          nextDeck.cardInformationEntries = nextDeck.cardInformationEntries.map((entry) =>
            entry.id === entryId ? { ...entry, archivedAt, updatedAt: archivedAt } : entry
          );

          return nextDeck;
        }

        nextDeck.symbolInformationEntries = nextDeck.symbolInformationEntries.map((entry) =>
          entry.id === entryId ? { ...entry, archivedAt, updatedAt: archivedAt } : entry
        );

        return nextDeck;
      },
      {
        flash: {
          tone: "success",
          text: "Entry archived.",
        },
      }
    );

    resetEntryDraft();
  }

  function handleCreateSymbol() {
    if (!selectedDeck || !symbolDraft.name.trim()) {
      return;
    }

    const symbolId = slugify(symbolDraft.name) || createPortableId("symbol");
    const alreadyExists = selectedDeck.symbols.some((symbol) => symbol.symbolId === symbolId);

    if (alreadyExists) {
      setFlashMessage({
        tone: "error",
        text: "Symbol already exists in this deck.",
      });
      return;
    }

    updateSelectedDeck(
      (currentDeck) => {
        const nextDeck = withKnowledgeVersion(currentDeck);

        nextDeck.symbols.push({
          id: createPortableId("symbol"),
          symbolId,
          name: symbolDraft.name.trim(),
          shortLabel: symbolDraft.name.trim(),
          description: symbolDraft.description.trim() || null,
          metadataJson: null,
        });
        nextDeck.symbolCount = nextDeck.symbols.length;

        return nextDeck;
      },
      {
        nextSubject: { kind: "symbol", symbolId },
        flash: {
          tone: "success",
          text: "Symbol created.",
        },
      }
    );

    setActiveTab("symbols");
    setSymbolDraft({ name: "", description: "" });
  }

  function handleLinkSymbol() {
    if (!selectedCard || !selectedDeck || !linkSymbolId) {
      return;
    }

    const symbolExists = selectedDeck.symbols.some((symbol) => symbol.symbolId === linkSymbolId);

    if (!symbolExists) {
      setFlashMessage({
        tone: "error",
        text: "Selected symbol is no longer available in this deck.",
      });
      setLinkSymbolId("");
      return;
    }

    const alreadyLinked = selectedDeck.cardSymbols.some(
      (link) => link.cardId === selectedCard.cardId && link.symbolId === linkSymbolId
    );

    if (alreadyLinked) {
      setFlashMessage({
        tone: "error",
        text: "Symbol is already linked to this card.",
      });
      setLinkSymbolId("");
      return;
    }

    updateSelectedDeck(
      (currentDeck) => {
        const nextDeck = withKnowledgeVersion(currentDeck);

        nextDeck.cardSymbols.push({
          id: createPortableId("link"),
          cardId: selectedCard.cardId,
          symbolId: linkSymbolId,
          sortOrder:
            nextDeck.cardSymbols.filter((link) => link.cardId === selectedCard.cardId).length + 1,
          placementHintJson: null,
          linkNote: null,
        });
        nextDeck.symbolCount = nextDeck.symbols.length;

        return nextDeck;
      },
      {
        flash: {
          tone: "success",
          text: "Symbol linked to card.",
        },
      }
    );

    setLinkSymbolId("");
  }

  function handleUnlinkSymbol(symbolId: string) {
    if (!selectedCard) {
      return;
    }

    updateSelectedDeck(
      (currentDeck) => {
        const nextDeck = withKnowledgeVersion(currentDeck);
        nextDeck.cardSymbols = nextDeck.cardSymbols.filter(
          (link) => !(link.cardId === selectedCard.cardId && link.symbolId === symbolId)
        );
        return nextDeck;
      },
      {
        flash: {
          tone: "success",
          text: "Symbol link removed.",
        },
      }
    );
  }

  function handleCreateSource() {
    const title = sourceDraft.title.trim();

    if (!title) {
      return;
    }

    updateSelectedDeck(
      (currentDeck) => {
        const nextDeck = withKnowledgeVersion(currentDeck);
        const now = createNow();
        const sourceId = createUniqueSourceId(nextDeck, title);

        nextDeck.knowledgeSources.push({
          id: createPortableId("source"),
          sourceId,
          kind: sourceDraft.kind,
          title,
          capturedAt: now,
          author: null,
          publisher: null,
          url: sourceDraft.url.trim() || null,
          citationText: null,
          publishedAt: null,
          rightsNote: null,
          metadataJson: null,
        });

        return nextDeck;
      },
      {
        flash: {
          tone: "success",
          text: "Source added.",
        },
      }
    );

    setSourceDraft({
      title: "",
      url: "",
      kind: "manual_reference",
    });
  }

  function handleRestoreStarterLibrary() {
    const nextSnapshot = createSeedDeckLibrarySnapshot(
      availableDecks,
      preferences.defaultDeckId
    );

    void persistSnapshot(nextSnapshot);
    setSelectedSubject(null);
    setActiveTab("cards");
    resetEntryDraft();
    setFilterQuery("");
    setFlashMessage({
      tone: "success",
      text: "Starter deck library restored.",
    });
  }

  function handleCreateEmptyDeck() {
    if (!snapshot || !selectedDeck) {
      return;
    }

    const clonedDeck = createEmptyDeckClone(selectedDeck);
    const nextSnapshot = {
      activeDeckId: clonedDeck.id,
      decks: [...snapshot.decks.map((deck) => cloneDeck(deck)), clonedDeck],
    };

    void persistSnapshot(nextSnapshot);
    setSelectedSubject(clonedDeck.cards[0] ? { kind: "card", cardId: clonedDeck.cards[0].cardId } : null);
    setActiveTab("cards");
    setFlashMessage({
      tone: "success",
      text: "Empty deck created.",
    });
  }

  function handleExportDeck() {
    if (!selectedDeck) {
      return;
    }

    const exportDocument = buildDeckExportDocument(selectedDeck);
    const blob = new Blob([JSON.stringify(exportDocument, null, 2)], {
      type: "application/json",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = `${selectedDeck.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.deck.json`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);

    setFlashMessage({
      tone: "success",
      text: "Deck export downloaded.",
    });
  }

  async function handleImportDeck(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !snapshot) {
      return;
    }

    try {
      const rawValue = await file.text();
      const parsed = JSON.parse(rawValue);
      const nextSnapshot = importDeckFromDocument(parsed, snapshot);
      await persistSnapshot(nextSnapshot);
      setSelectedSubject(null);
      setActiveTab("cards");
      setFlashMessage({
        tone: "success",
        text: "Deck imported into your local library.",
      });
    } catch (error) {
      setFlashMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Import failed.",
      });
    } finally {
      event.target.value = "";
    }
  }

  if (!snapshot) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
        <section className="surface w-full rounded-2xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Tarology v2
          </p>
          <h1 className="mt-2 text-2xl text-[var(--color-ink)]">Preparing deck surface</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Loading your personal deck library snapshot.
          </p>
        </section>
      </main>
    );
  }

  if (!selectedDeck) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
        <section className="surface w-full rounded-2xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Deck Library
          </p>
          <h1 className="mt-2 text-2xl text-[var(--color-ink)]">No deck library available</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Your local deck snapshot is empty or missing a recoverable active deck.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {availableDecks.length > 0 ? (
              <button
                type="button"
                className={primaryButtonClass}
                onClick={handleRestoreStarterLibrary}
              >
                Restore starter library
              </button>
            ) : null}
            <Link href="/reading" className={buttonClass}>
              Back to Reading
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-4 lg:px-8">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Deck Library
            </p>
            <h1 className="text-lg font-semibold text-[var(--color-ink)]">
              {selectedDeck.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={buttonClass} onClick={handleCreateEmptyDeck}>
              New Empty Deck
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => importInputRef.current?.click()}
            >
              Import Deck
            </button>
            <button type="button" className={primaryButtonClass} onClick={handleExportDeck}>
              Export Deck
            </button>
            <Link href="/reading" className={buttonClass}>
              Back to Reading
            </Link>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => void handleImportDeck(event)}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)_380px] lg:px-8">
        <aside className="surface rounded-[1.5rem] p-4">
          <div className="rounded-[1.1rem] border border-[var(--color-border)] bg-black/20 p-4">
            <div className="flex items-center gap-3">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="h-12 w-12 rounded-full border border-[var(--color-border-strong)] object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[rgba(193,168,106,0.18)] text-sm font-semibold text-[#f6ecd4]">
                  {buildInitials(profile.displayName)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                  {profile.displayName}
                </p>
                <p className="truncate text-xs text-[var(--color-muted)]">{profile.email}</p>
              </div>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.08em] text-[var(--color-muted)]">
              Default deck
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
              {preferences.defaultDeck?.name ?? "Not set"}
            </p>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-ink)]">Your decks</h2>
              <span className="text-xs text-[var(--color-muted)]">{snapshot.decks.length}</span>
            </div>
            <div className="space-y-2">
              {snapshot.decks.map((deck) => {
                const isActive = deck.id === snapshot.activeDeckId;
                const isDefault = deck.id === preferences.defaultDeckId;

                return (
                  <button
                    key={deck.id}
                    type="button"
                    onClick={() => selectDeck(deck.id)}
                    className={`w-full rounded-[1rem] border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-[var(--color-accent)] bg-[rgba(193,168,106,0.08)]"
                        : "border-[var(--color-border)] bg-black/10 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                          {deck.name}
                        </span>
                        <span className="block truncate text-xs text-[var(--color-muted)]">
                          {deck.initializationMode.replaceAll("_", " ")}
                        </span>
                      </span>
                      {isDefault ? (
                        <span className="rounded-full bg-[rgba(193,168,106,0.16)] px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-accent)]">
                          Default
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <section className="surface rounded-[1.5rem] p-5">
            <div className="flex flex-col gap-4 md:flex-row">
              <img
                src={selectedDeck.previewImageUrl ?? undefined}
                alt={`${selectedDeck.name} preview`}
                className="h-44 w-32 rounded-[1.15rem] border border-[var(--color-border-strong)] object-cover shadow-[0_16px_34px_rgba(0,0,0,0.28)]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-[var(--color-ink)]">
                    {selectedDeck.name}
                  </h2>
                  <span className="rounded-full border border-[var(--color-border)] px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                    Spec {selectedDeck.specVersion}
                  </span>
                  <span className="rounded-full border border-[var(--color-border)] px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                    Knowledge v{selectedDeck.knowledgeVersion}
                  </span>
                </div>
                <p className="mt-3 max-w-3xl text-sm text-[var(--color-muted)]">
                  {selectedDeck.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
                  <span>{selectedDeck.cardCount} cards</span>
                  <span>{selectedDeck.symbolCount} symbols</span>
                  <span>{selectedDeck.knowledgeSources.length} sources</span>
                  <span>{selectedDeck.initializationMode.replaceAll("_", " ")}</span>
                </div>
                {flashMessage ? (
                  <p
                    className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
                      flashMessage.tone === "success"
                        ? "border-[rgba(120,196,150,0.32)] bg-[rgba(56,97,74,0.25)] text-[#caecd9]"
                        : "border-[rgba(222,117,117,0.4)] bg-[rgba(120,33,33,0.22)] text-[#f5c8c8]"
                    }`}
                  >
                    {flashMessage.text}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="surface rounded-[1.5rem] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`${buttonClass} ${activeTab === "cards" ? "border-[var(--color-accent)]" : ""}`}
                  onClick={() => setActiveTab("cards")}
                >
                  Cards
                </button>
                <button
                  type="button"
                  className={`${buttonClass} ${activeTab === "symbols" ? "border-[var(--color-accent)]" : ""}`}
                  onClick={() => setActiveTab("symbols")}
                >
                  Symbols
                </button>
              </div>
              <input
                type="search"
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                className={`${inputClass} md:max-w-xs`}
                placeholder={activeTab === "cards" ? "Search cards" : "Search symbols"}
              />
            </div>

            {activeTab === "cards" ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCards.map((card) => {
                  const isSelected = selectedCard?.cardId === card.cardId;

                  return (
                    <button
                      key={card.cardId}
                      type="button"
                      onClick={() => setSelectedSubject({ kind: "card", cardId: card.cardId })}
                      className={`rounded-[1.2rem] border p-3 text-left transition ${
                        isSelected
                          ? "border-[var(--color-accent)] bg-[rgba(193,168,106,0.08)]"
                          : "border-[var(--color-border)] bg-black/10 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex gap-3">
                        <img
                          src={card.faceImageUrl ?? selectedDeck.previewImageUrl ?? undefined}
                          alt={`${card.name} art`}
                          className="h-24 w-16 rounded-[0.9rem] border border-[var(--color-border-strong)] object-cover"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[var(--color-ink)]">
                            {card.name}
                          </span>
                          <span className="mt-1 block text-xs text-[var(--color-muted)]">
                            {entryCountForCard(selectedDeck, card.cardId)} entries •{" "}
                            {linkedSymbolsForCard(selectedDeck, card.cardId).length} linked symbols
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-[1.15rem] border border-[var(--color-border)] bg-black/10 p-4">
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">Create symbol</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
                    <input
                      type="text"
                      value={symbolDraft.name}
                      onChange={(event) =>
                        setSymbolDraft((current) => ({ ...current, name: event.target.value }))
                      }
                      className={inputClass}
                      placeholder="Symbol name"
                    />
                    <input
                      type="text"
                      value={symbolDraft.description}
                      onChange={(event) =>
                        setSymbolDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="Short description"
                    />
                    <button type="button" className={primaryButtonClass} onClick={handleCreateSymbol}>
                      Add Symbol
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {filteredSymbols.map((symbol) => {
                    const isSelected = selectedSymbol?.symbolId === symbol.symbolId;

                    return (
                      <button
                        key={symbol.symbolId}
                        type="button"
                        onClick={() =>
                          setSelectedSubject({ kind: "symbol", symbolId: symbol.symbolId })
                        }
                        className={`rounded-[1.2rem] border p-4 text-left transition ${
                          isSelected
                            ? "border-[var(--color-accent)] bg-[rgba(193,168,106,0.08)]"
                            : "border-[var(--color-border)] bg-black/10 hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className="block text-sm font-semibold text-[var(--color-ink)]">
                          {symbol.name}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--color-muted)]">
                          {symbol.description}
                        </span>
                        <span className="mt-2 block text-xs text-[var(--color-muted)]">
                          {entryCountForSymbol(selectedDeck, symbol.symbolId)} entries •{" "}
                          {linkedCardsForSymbol(selectedDeck, symbol.symbolId).length} linked cards
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </section>

        <aside className="surface rounded-[1.5rem] p-5">
          {selectedCard ? (
            <>
              <div className="flex gap-3">
                <img
                  src={selectedCard.faceImageUrl ?? selectedDeck.previewImageUrl ?? undefined}
                  alt={`${selectedCard.name} art`}
                  className="h-36 w-24 rounded-[1rem] border border-[var(--color-border-strong)] object-cover"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                    Card
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-[var(--color-ink)]">
                    {selectedCard.name}
                  </h3>
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    {selectedCard.cardId}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                    Linked symbols
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {linkedSymbols.map((symbol) => (
                      <span
                        key={symbol.symbolId}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-black/10 px-3 py-1 text-xs text-[var(--color-ink)]"
                      >
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => {
                            setActiveTab("symbols");
                            setSelectedSubject({ kind: "symbol", symbolId: symbol.symbolId });
                          }}
                        >
                          {symbol.name}
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${symbol.name} link`}
                          onClick={() => handleUnlinkSymbol(symbol.symbolId)}
                          className="text-[var(--color-muted)]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <select
                      value={linkSymbolId}
                      onChange={(event) => setLinkSymbolId(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Link existing symbol</option>
                      {availableSymbolsToLink.map((symbol) => (
                        <option key={symbol.symbolId} value={symbol.symbolId}>
                          {symbol.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" className={buttonClass} onClick={handleLinkSymbol}>
                      Link
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : selectedSymbol ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                Symbol
              </p>
              <h3 className="mt-1 text-xl font-semibold text-[var(--color-ink)]">
                {selectedSymbol.name}
              </h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {selectedSymbol.description}
              </p>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                  Linked cards
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {linkedCards.map((card) => (
                    <button
                      key={card.cardId}
                      type="button"
                      onClick={() => {
                        setActiveTab("cards");
                        setSelectedSubject({ kind: "card", cardId: card.cardId });
                      }}
                      className="rounded-full border border-[var(--color-border)] bg-black/10 px-3 py-1 text-xs text-[var(--color-ink)] transition hover:bg-white/[0.04]"
                    >
                      {card.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          <div className="mt-6 space-y-5">
            <section>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[var(--color-ink)]">Entries</h4>
                {editingEntryId ? (
                  <button type="button" className={buttonClass} onClick={resetEntryDraft}>
                    Cancel edit
                  </button>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {selectedEntries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-[1rem] border border-[var(--color-border)] bg-black/10 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                          {entry.label}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
                          {entry.format === "json" ? "Imported JSON entry" : entry.format.replace("_", " ")}
                        </p>
                        <pre className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-ink)] font-sans">
                          {entryBodyPreview(entry)}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        {isEditableEntry(entry) ? (
                          <button
                            type="button"
                            className={buttonClass}
                            onClick={() => startEditingEntry(entry)}
                          >
                            Edit
                          </button>
                        ) : (
                          <span className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)]">
                            View only
                          </span>
                        )}
                        <button
                          type="button"
                          className={buttonClass}
                          onClick={() => handleArchiveEntry(entry.id)}
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-4 rounded-[1rem] border border-[var(--color-border)] bg-black/10 p-4">
                <h5 className="text-sm font-semibold text-[var(--color-ink)]">
                  {editingEntryId ? "Edit entry" : "Add entry"}
                </h5>
                <div className="mt-3 space-y-3">
                  <input
                    type="text"
                    value={entryDraft.label}
                    onChange={(event) =>
                      setEntryDraft((current) => ({ ...current, label: event.target.value }))
                    }
                    className={inputClass}
                    placeholder="Label"
                  />
                  <select
                    value={entryDraft.format}
                    onChange={(event) =>
                      setEntryDraft((current) => ({
                        ...current,
                        format: event.target.value as DeckEntryFormat,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="plain_text">Plain text</option>
                    <option value="markdown">Markdown</option>
                  </select>
                  <select
                    value={entryDraft.sourceId}
                    onChange={(event) =>
                      setEntryDraft((current) => ({ ...current, sourceId: event.target.value }))
                    }
                    className={inputClass}
                  >
                    <option value="">No source</option>
                    {selectedDeck.knowledgeSources.map((source) => (
                      <option key={source.sourceId} value={source.sourceId}>
                        {source.title}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={entryDraft.bodyText}
                    onChange={(event) =>
                      setEntryDraft((current) => ({ ...current, bodyText: event.target.value }))
                    }
                    className={`${inputClass} min-h-28 resize-y`}
                    placeholder="Write the layered knowledge entry here"
                  />
                  <button type="button" className={primaryButtonClass} onClick={handleSaveEntry}>
                    {editingEntryId ? "Save changes" : "Add entry"}
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-sm font-semibold text-[var(--color-ink)]">Sources</h4>
              <div className="mt-3 space-y-2">
                {selectedDeck.knowledgeSources.map((source) => (
                  <article
                    key={source.sourceId}
                    className="rounded-[1rem] border border-[var(--color-border)] bg-black/10 p-3"
                  >
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{source.title}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {source.kind.replaceAll("_", " ")}
                    </p>
                    {source.url ? (
                      <p className="mt-2 text-xs text-[var(--color-accent)]">{source.url}</p>
                    ) : null}
                  </article>
                ))}
              </div>

              <div className="mt-4 rounded-[1rem] border border-[var(--color-border)] bg-black/10 p-4">
                <h5 className="text-sm font-semibold text-[var(--color-ink)]">Add source</h5>
                <div className="mt-3 space-y-3">
                  <input
                    type="text"
                    value={sourceDraft.title}
                    onChange={(event) =>
                      setSourceDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    className={inputClass}
                    placeholder="Source title"
                  />
                  <select
                    value={sourceDraft.kind}
                    onChange={(event) =>
                      setSourceDraft((current) => ({
                        ...current,
                        kind: event.target.value as DeckKnowledgeSourceKind,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="manual_reference">Manual reference</option>
                    <option value="reader_note">Reader note</option>
                    <option value="starter_content">Starter content</option>
                    <option value="imported_reference">Imported reference</option>
                  </select>
                  <input
                    type="url"
                    value={sourceDraft.url}
                    onChange={(event) =>
                      setSourceDraft((current) => ({ ...current, url: event.target.value }))
                    }
                    className={inputClass}
                    placeholder="Optional URL"
                  />
                  <button type="button" className={buttonClass} onClick={handleCreateSource}>
                    Save Source
                  </button>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}
