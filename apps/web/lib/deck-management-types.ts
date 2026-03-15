import type { DeckSummary } from "@tarology/shared";

export type DeckInitializationMode =
  | "starter_content"
  | "empty_template"
  | "imported_clone";

export type DeckEntryFormat = "plain_text" | "markdown";
export type DeckStoredEntryFormat = DeckEntryFormat | "json";

export type DeckKnowledgeSourceKind =
  | "reader_note"
  | "starter_content"
  | "imported_reference"
  | "manual_reference"
  | "external_enrichment";

export interface DeckLibraryCard {
  id: string;
  cardId: string;
  name: string;
  sortOrder: number;
  shortLabel: string | null;
  faceImageUrl: string | null;
  metadataJson: Record<string, unknown> | null;
}

export interface DeckLibrarySymbol {
  id: string;
  symbolId: string;
  name: string;
  shortLabel: string | null;
  description: string | null;
  metadataJson: Record<string, unknown> | null;
}

export interface DeckLibraryCardSymbol {
  id: string;
  cardId: string;
  symbolId: string;
  sortOrder: number | null;
  placementHintJson: Record<string, unknown> | null;
  linkNote: string | null;
}

export interface DeckKnowledgeSource {
  id: string;
  sourceId: string;
  kind: DeckKnowledgeSourceKind;
  title: string;
  capturedAt: string;
  author: string | null;
  publisher: string | null;
  url: string | null;
  citationText: string | null;
  publishedAt: string | null;
  rightsNote: string | null;
  metadataJson: Record<string, unknown> | null;
}

export interface DeckEntryBase {
  id: string;
  entryId: string;
  label: string;
  format: DeckStoredEntryFormat;
  bodyText: string;
  bodyJson: Record<string, unknown> | null;
  summary: string | null;
  tags: string[];
  sourceIds: string[];
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeckCardEntry extends DeckEntryBase {
  cardId: string;
}

export interface DeckSymbolEntry extends DeckEntryBase {
  symbolId: string;
}

export interface DeckLibraryDeck extends DeckSummary {
  knowledgeVersion: number;
  initializationMode: DeckInitializationMode;
  initializerKey: string | null;
  originExportDigest: string | null;
  symbolCount: number;
  cards: DeckLibraryCard[];
  symbols: DeckLibrarySymbol[];
  cardSymbols: DeckLibraryCardSymbol[];
  knowledgeSources: DeckKnowledgeSource[];
  cardInformationEntries: DeckCardEntry[];
  symbolInformationEntries: DeckSymbolEntry[];
}

export interface DeckLibrarySnapshot {
  activeDeckId: string;
  decks: DeckLibraryDeck[];
}

export type DeckEditorSubject =
  | { kind: "card"; cardId: string }
  | { kind: "symbol"; symbolId: string };

export interface DeckExportDocument {
  format: "tarology.deck.export";
  version: 1;
  exportedAt: string;
  deck: {
    name: string;
    description: string | null;
    deckSpecVersion: string;
    knowledgeVersion: number;
    initializationMode: DeckInitializationMode;
    initializerKey: string | null;
    previewImageUrl: string | null;
    backImageUrl: string | null;
    cardCount: number;
    originExportDigest?: string | null;
    exportNotes?: string | null;
  };
  cards: Array<{
    cardId: string;
    name: string;
    sortOrder: number;
    shortLabel?: string | null;
    faceImageUrl?: string | null;
    metadataJson?: Record<string, unknown> | null;
  }>;
  symbols: Array<{
    symbolId: string;
    name: string;
    shortLabel?: string | null;
    description?: string | null;
    metadataJson?: Record<string, unknown> | null;
  }>;
  cardSymbols: Array<{
    cardId: string;
    symbolId: string;
    sortOrder?: number | null;
    placementHintJson?: Record<string, unknown> | null;
    linkNote?: string | null;
  }>;
  knowledgeSources: Array<{
    sourceId: string;
    kind: DeckKnowledgeSourceKind;
    title: string;
    capturedAt: string;
    author?: string | null;
    publisher?: string | null;
    url?: string | null;
    citationText?: string | null;
    publishedAt?: string | null;
    rightsNote?: string | null;
    metadataJson?: Record<string, unknown> | null;
  }>;
  cardInformationEntries: Array<{
    entryId: string;
    cardId: string;
    label: string;
    format: DeckEntryFormat | "json";
    summary: string | null;
    tags?: string[];
    sourceIds: string[];
    sortOrder: number;
    archivedAt?: string | null;
    bodyText?: string | null;
    bodyJson?: Record<string, unknown> | null;
  }>;
  symbolInformationEntries: Array<{
    entryId: string;
    symbolId: string;
    label: string;
    format: DeckEntryFormat | "json";
    summary: string | null;
    tags?: string[];
    sourceIds: string[];
    sortOrder: number;
    archivedAt?: string | null;
    bodyText?: string | null;
    bodyJson?: Record<string, unknown> | null;
  }>;
}
