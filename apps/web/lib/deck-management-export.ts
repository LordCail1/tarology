import { cloneDeckLibraryDeck } from "./deck-management-thoth";
import type {
  DeckExportDocument,
  DeckLibraryDeck,
  DeckLibrarySnapshot,
  DeckCardEntry,
  DeckSymbolEntry,
} from "./deck-management-types";

function createPortableId(prefix: string): string {
  const token =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  return `${prefix}:${token}`;
}

function digestValue(input: string): string {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }

  return `digest:${Math.abs(hash).toString(16)}`;
}

function toCardEntryPayload(entry: DeckCardEntry): DeckExportDocument["cardInformationEntries"][number] {
  const payload = {
    entryId: entry.entryId,
    cardId: entry.cardId,
    label: entry.label,
    format: entry.format,
    summary: entry.summary,
    tags: entry.tags,
    sourceIds: entry.sourceIds,
    sortOrder: entry.sortOrder,
    archivedAt: entry.archivedAt,
  };

  return entry.format === "json"
    ? {
        ...payload,
        bodyJson: entry.bodyJson,
      }
    : {
        ...payload,
        bodyText: entry.bodyText,
      };
}

function toSymbolEntryPayload(
  entry: DeckSymbolEntry
): DeckExportDocument["symbolInformationEntries"][number] {
  const payload = {
    entryId: entry.entryId,
    symbolId: entry.symbolId,
    label: entry.label,
    format: entry.format,
    summary: entry.summary,
    tags: entry.tags,
    sourceIds: entry.sourceIds,
    sortOrder: entry.sortOrder,
    archivedAt: entry.archivedAt,
  };

  return entry.format === "json"
    ? {
        ...payload,
        bodyJson: entry.bodyJson,
      }
    : {
        ...payload,
        bodyText: entry.bodyText,
      };
}

export function buildDeckExportDocument(deck: DeckLibraryDeck): DeckExportDocument {
  return {
    format: "tarology.deck.export",
    version: 1,
    exportedAt: new Date().toISOString(),
    deck: {
      name: deck.name,
      description: deck.description,
      deckSpecVersion: deck.specVersion,
      knowledgeVersion: deck.knowledgeVersion,
      initializationMode: deck.initializationMode,
      initializerKey: deck.initializerKey,
      previewImageUrl: deck.previewImageUrl,
      backImageUrl: deck.backImageUrl,
      cardCount: deck.cardCount,
      originExportDigest: deck.originExportDigest,
    },
    cards: deck.cards.map((card) => ({
      cardId: card.cardId,
      name: card.name,
      sortOrder: card.sortOrder,
      shortLabel: card.shortLabel,
      faceImageUrl: card.faceImageUrl,
      metadataJson: card.metadataJson,
    })),
    symbols: deck.symbols.map((symbol) => ({
      symbolId: symbol.symbolId,
      name: symbol.name,
      shortLabel: symbol.shortLabel,
      description: symbol.description,
      metadataJson: symbol.metadataJson,
    })),
    cardSymbols: deck.cardSymbols.map((link) => ({
      cardId: link.cardId,
      symbolId: link.symbolId,
      sortOrder: link.sortOrder,
      placementHintJson: link.placementHintJson,
      linkNote: link.linkNote,
    })),
    knowledgeSources: deck.knowledgeSources.map((source) => ({
      sourceId: source.sourceId,
      kind: source.kind,
      title: source.title,
      capturedAt: source.capturedAt,
      author: source.author,
      publisher: source.publisher,
      url: source.url,
      citationText: source.citationText,
      publishedAt: source.publishedAt,
      rightsNote: source.rightsNote,
      metadataJson: source.metadataJson,
    })),
    cardInformationEntries: deck.cardInformationEntries.map(toCardEntryPayload),
    symbolInformationEntries: deck.symbolInformationEntries.map(toSymbolEntryPayload),
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toOptionalRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toDisplayBodyText(bodyJson: Record<string, unknown>): string {
  return JSON.stringify(bodyJson, null, 2);
}

function importCardEntry(
  entry: DeckExportDocument["cardInformationEntries"][number],
  importedAt: string
): DeckCardEntry {
  const bodyJson = toOptionalRecord(entry.bodyJson);

  if (entry.format === "json") {
    assert(bodyJson, "JSON card knowledge entries must include bodyJson.");

    return {
      id: createPortableId("entry"),
      entryId: entry.entryId,
      cardId: entry.cardId,
      label: entry.label,
      format: "json",
      bodyText: toDisplayBodyText(bodyJson),
      bodyJson,
      summary: entry.summary,
      tags: toStringArray(entry.tags),
      sourceIds: toStringArray(entry.sourceIds),
      sortOrder: entry.sortOrder,
      archivedAt: toOptionalString(entry.archivedAt),
      createdAt: importedAt,
      updatedAt: importedAt,
    };
  }

  assert(typeof entry.bodyText === "string", "Text card knowledge entries must include bodyText.");

  return {
    id: createPortableId("entry"),
    entryId: entry.entryId,
    cardId: entry.cardId,
    label: entry.label,
    format: entry.format === "markdown" ? "markdown" : "plain_text",
    bodyText: entry.bodyText,
    bodyJson: null,
    summary: entry.summary,
    tags: toStringArray(entry.tags),
    sourceIds: toStringArray(entry.sourceIds),
    sortOrder: entry.sortOrder,
    archivedAt: toOptionalString(entry.archivedAt),
    createdAt: importedAt,
    updatedAt: importedAt,
  };
}

function importSymbolEntry(
  entry: DeckExportDocument["symbolInformationEntries"][number],
  importedAt: string
): DeckSymbolEntry {
  const bodyJson = toOptionalRecord(entry.bodyJson);

  if (entry.format === "json") {
    assert(bodyJson, "JSON symbol knowledge entries must include bodyJson.");

    return {
      id: createPortableId("entry"),
      entryId: entry.entryId,
      symbolId: entry.symbolId,
      label: entry.label,
      format: "json",
      bodyText: toDisplayBodyText(bodyJson),
      bodyJson,
      summary: entry.summary,
      tags: toStringArray(entry.tags),
      sourceIds: toStringArray(entry.sourceIds),
      sortOrder: entry.sortOrder,
      archivedAt: toOptionalString(entry.archivedAt),
      createdAt: importedAt,
      updatedAt: importedAt,
    };
  }

  assert(
    typeof entry.bodyText === "string",
    "Text symbol knowledge entries must include bodyText."
  );

  return {
    id: createPortableId("entry"),
    entryId: entry.entryId,
    symbolId: entry.symbolId,
    label: entry.label,
    format: entry.format === "markdown" ? "markdown" : "plain_text",
    bodyText: entry.bodyText,
    bodyJson: null,
    summary: entry.summary,
    tags: toStringArray(entry.tags),
    sourceIds: toStringArray(entry.sourceIds),
    sortOrder: entry.sortOrder,
    archivedAt: toOptionalString(entry.archivedAt),
    createdAt: importedAt,
    updatedAt: importedAt,
  };
}

export function importDeckFromDocument(
  document: DeckExportDocument,
  snapshot: DeckLibrarySnapshot
): DeckLibrarySnapshot {
  assert(document.format === "tarology.deck.export", "Unsupported deck export format.");
  assert(document.version === 1, "Unsupported deck export version.");
  assert(document.cards.length > 0, "Deck export must include cards.");

  const importedAt = new Date().toISOString();
  const serializedDocument = JSON.stringify(document);
  const deckId = createPortableId("deck");
  const clonedDeck: DeckLibraryDeck = {
    id: deckId,
    name: `${document.deck.name} (Imported)`,
    description: document.deck.description,
    specVersion: document.deck.deckSpecVersion,
    previewImageUrl: document.deck.previewImageUrl,
    backImageUrl: document.deck.backImageUrl,
    cardCount: document.cards.length,
    knowledgeVersion: document.deck.knowledgeVersion,
    initializationMode: "imported_clone",
    initializerKey: document.deck.initializerKey,
    originExportDigest: digestValue(serializedDocument),
    symbolCount: document.symbols.length,
    cards: document.cards.map((card) => ({
      id: createPortableId("card"),
      cardId: card.cardId,
      name: card.name,
      sortOrder: card.sortOrder,
      shortLabel: toOptionalString(card.shortLabel),
      faceImageUrl: toOptionalString(card.faceImageUrl),
      metadataJson: toOptionalRecord(card.metadataJson),
    })),
    symbols: document.symbols.map((symbol) => ({
      id: createPortableId("symbol"),
      symbolId: symbol.symbolId,
      name: symbol.name,
      shortLabel: toOptionalString(symbol.shortLabel),
      description: toOptionalString(symbol.description),
      metadataJson: toOptionalRecord(symbol.metadataJson),
    })),
    cardSymbols: document.cardSymbols.map((link) => ({
      id: createPortableId("link"),
      cardId: link.cardId,
      symbolId: link.symbolId,
      sortOrder: typeof link.sortOrder === "number" ? link.sortOrder : null,
      placementHintJson: toOptionalRecord(link.placementHintJson),
      linkNote: toOptionalString(link.linkNote),
    })),
    knowledgeSources: document.knowledgeSources.map((source) => ({
      id: createPortableId("source"),
      sourceId: source.sourceId,
      kind: source.kind,
      title: source.title,
      capturedAt: source.capturedAt,
      author: toOptionalString(source.author),
      publisher: toOptionalString(source.publisher),
      url: toOptionalString(source.url),
      citationText: toOptionalString(source.citationText),
      publishedAt: toOptionalString(source.publishedAt),
      rightsNote: toOptionalString(source.rightsNote),
      metadataJson: toOptionalRecord(source.metadataJson),
    })),
    cardInformationEntries: document.cardInformationEntries.map((entry) =>
      importCardEntry(entry, importedAt)
    ),
    symbolInformationEntries: document.symbolInformationEntries.map((entry) =>
      importSymbolEntry(entry, importedAt)
    ),
  };

  return {
    activeDeckId: clonedDeck.id,
    decks: [...snapshot.decks.map((deck) => cloneDeckLibraryDeck(deck)), clonedDeck],
  };
}
