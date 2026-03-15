import type { DeckSummary } from "@tarology/shared";
import type {
  DeckCardEntry,
  DeckKnowledgeSource,
  DeckLibraryCard,
  DeckLibraryCardSymbol,
  DeckLibraryDeck,
  DeckLibrarySymbol,
  DeckSymbolEntry,
} from "./deck-management-types";

const THOTH_MAJOR_ARCANA = [
  ["major:the-fool", "The Fool", "TheFool.jpg"],
  ["major:the-magician", "The Magician", "TheMagician.jpg"],
  ["major:the-priestess", "The High Priestess", "TheHighPriestess.jpg"],
  ["major:the-empress", "The Empress", "TheEmpress.jpg"],
  ["major:the-emperor", "The Emperor", "TheEmperor.jpg"],
  ["major:the-hierophant", "The Hierophant", "TheHierophant.jpg"],
  ["major:the-lovers", "The Lovers", "TheLovers.jpg"],
  ["major:the-chariot", "The Chariot", "TheChariot.jpg"],
  ["major:adjustment", "Adjustment", "Adjustment.jpg"],
  ["major:the-hermit", "The Hermit", "TheHermit.jpg"],
  ["major:wheel-of-fortune", "Wheel of Fortune", "WheelOfFortune.jpg"],
  ["major:lust", "Lust", "Lust.jpg"],
  ["major:the-hanged-man", "The Hanged Man", "TheHangedMan.jpg"],
  ["major:death", "Death", "Death.jpg"],
  ["major:art", "Art", "Art.jpg"],
  ["major:the-devil", "The Devil", "TheDevil.jpg"],
  ["major:the-tower", "The Tower", "TheTower.jpg"],
  ["major:the-star", "The Star", "TheStar.jpg"],
  ["major:the-moon", "The Moon", "TheMoon.jpg"],
  ["major:the-sun", "The Sun", "TheSun.jpg"],
  ["major:the-aeon", "The Aeon", "TheAon.jpg"],
  ["major:the-universe", "The Universe", "TheUniverse.jpg"],
] as const;

const THOTH_SUITS = ["wands", "cups", "swords", "disks"] as const;
const THOTH_MINOR_RANKS = [
  "ace",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "knight",
  "queen",
  "prince",
  "princess",
] as const;

const THOTH_SYMBOL_LIBRARY = [
  {
    symbolId: "sun-disk",
    name: "Sun Disk",
    description: "Radiance, illumination, and conscious vitality.",
    linkedCards: ["major:the-sun", "major:the-aeon", "major:the-fool"],
  },
  {
    symbolId: "lotus",
    name: "Lotus",
    description: "Emergence, receptivity, and unfolding perception.",
    linkedCards: ["major:the-priestess", "minor:cups:ace", "minor:cups:queen"],
  },
  {
    symbolId: "crown",
    name: "Crown",
    description: "Authority, burden, and earned responsibility.",
    linkedCards: ["major:the-emperor", "minor:wands:six", "minor:disks:ten"],
  },
  {
    symbolId: "serpent",
    name: "Serpent",
    description: "Instinct, transformation, and volatile appetite.",
    linkedCards: ["major:lust", "major:the-devil", "major:death"],
  },
  {
    symbolId: "sword-cluster",
    name: "Sword Cluster",
    description: "Discernment, rupture, and cutting clarity.",
    linkedCards: ["minor:swords:three", "minor:swords:five", "minor:swords:queen"],
  },
  {
    symbolId: "cup-vessel",
    name: "Cup Vessel",
    description: "Containment, emotion, devotion, and overflow.",
    linkedCards: ["minor:cups:two", "minor:cups:queen", "minor:cups:ten"],
  },
  {
    symbolId: "wand-flame",
    name: "Wand Flame",
    description: "Will, ignition, and directed momentum.",
    linkedCards: ["minor:wands:ace", "minor:wands:three", "minor:wands:knight"],
  },
  {
    symbolId: "disk-orbit",
    name: "Disk Orbit",
    description: "Material circulation, pattern, and embodied structure.",
    linkedCards: ["minor:disks:ace", "minor:disks:six", "minor:disks:ten"],
  },
] as const;

const STARTER_SOURCE_ID = "starter:thoth-bundle";
const READER_SOURCE_ID = "reader:field-notes";

function toSentenceCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function toTitleCaseSegment(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toId(prefix: string, value: string): string {
  return `${prefix}:${value}`;
}

function currentIso(): string {
  return new Date().toISOString();
}

function createMinorCard(cardId: string, sortOrder: number): DeckLibraryCard {
  const [, suit, rank] = cardId.split(":");
  const suitLabel = toSentenceCase(suit);
  const rankLabel = toTitleCaseSegment(rank);
  const fileStem = `${rankLabel.replaceAll(" ", "")}Of${suitLabel}`;

  return {
    id: toId("card", cardId),
    cardId,
    name: `${rankLabel} of ${suitLabel}`,
    sortOrder,
    shortLabel: rankLabel,
    faceImageUrl: `/images/cards/thoth/${fileStem}.jpg`,
    metadataJson: {
      suit,
      rank,
      arcana: "minor",
    },
  };
}

function buildThothCards(): DeckLibraryCard[] {
  const majorCards = THOTH_MAJOR_ARCANA.map(([cardId, name, fileName], sortOrder) => ({
    id: toId("card", cardId),
    cardId,
    name,
    sortOrder,
    shortLabel: name.replace(/^The /, ""),
    faceImageUrl: `/images/cards/thoth/${fileName}`,
    metadataJson: {
      arcana: "major",
    },
  }));

  const minorCards = THOTH_SUITS.flatMap((suit, suitIndex) =>
    THOTH_MINOR_RANKS.map((rank, rankIndex) =>
      createMinorCard(
        `minor:${suit}:${rank}`,
        THOTH_MAJOR_ARCANA.length + suitIndex * THOTH_MINOR_RANKS.length + rankIndex
      )
    )
  );

  return [...majorCards, ...minorCards];
}

function buildKnowledgeSources(): DeckKnowledgeSource[] {
  const now = currentIso();

  return [
    {
      id: STARTER_SOURCE_ID,
      sourceId: STARTER_SOURCE_ID,
      kind: "starter_content",
      title: "Thoth starter bundle (mock)",
      capturedAt: now,
      author: "Tarology",
      publisher: "Tarology",
      url: null,
      citationText:
        "Mock starter bundle used to make the deck-management surface feel real while curated production content is pending.",
      publishedAt: null,
      rightsNote: "Internal starter-content mock bundle.",
      metadataJson: {
        bundle: "thoth-starter-mock-v1",
      },
    },
    {
      id: READER_SOURCE_ID,
      sourceId: READER_SOURCE_ID,
      kind: "reader_note",
      title: "Reader field notes",
      capturedAt: now,
      author: "Reader",
      publisher: null,
      url: null,
      citationText:
        "Personal observation space for noting how symbols combine under pressure or clarity.",
      publishedAt: null,
      rightsNote: null,
      metadataJson: null,
    },
  ];
}

function buildCardEntries(cards: DeckLibraryCard[]): DeckCardEntry[] {
  const now = currentIso();

  return cards.flatMap((card) => {
    const entries: DeckCardEntry[] = [
      {
        id: toId("entry", `${card.cardId}:core-theme`),
        entryId: "core-theme",
        cardId: card.cardId,
        label: "core-theme",
        format: "plain_text",
        bodyText: `${card.name} is loaded here as starter-content mock knowledge. Treat it as a stable thematic anchor for the card rather than a final authoritative meaning.`,
        bodyJson: null,
        summary: `Starter note for ${card.name}.`,
        tags: ["starter", "theme"],
        sourceIds: [STARTER_SOURCE_ID],
        sortOrder: 1,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ];

    if (card.metadataJson?.arcana === "major") {
      entries.push({
        id: toId("entry", `${card.cardId}:reader-angle`),
        entryId: "reader-angle",
        cardId: card.cardId,
        label: "reader-angle",
        format: "markdown",
        bodyText: `- Notice how **${card.name}** changes tone depending on the question.\n- Track whether the symbol field feels clarifying, disruptive, or catalytic.\n- Use this as a reader-owned note slot once the starter bundle is no longer enough.`,
        bodyJson: null,
        summary: `Reader-facing prompt for ${card.name}.`,
        tags: ["reader-note", "prompt"],
        sourceIds: [READER_SOURCE_ID],
        sortOrder: 2,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return entries;
  });
}

function buildSymbols(): DeckLibrarySymbol[] {
  return THOTH_SYMBOL_LIBRARY.map((symbol) => ({
    id: toId("symbol", symbol.symbolId),
    symbolId: symbol.symbolId,
    name: symbol.name,
    shortLabel: symbol.name,
    description: symbol.description,
    metadataJson: {
      library: "thoth-starter",
    },
  }));
}

function buildSymbolEntries(symbols: DeckLibrarySymbol[]): DeckSymbolEntry[] {
  const now = currentIso();

  return symbols.map((symbol, index) => ({
    id: toId("entry", `${symbol.symbolId}:motif`),
    entryId: "motif",
    symbolId: symbol.symbolId,
    label: "motif",
    format: index % 2 === 0 ? "plain_text" : "markdown",
    bodyText:
      index % 2 === 0
        ? `${symbol.name} is stored as a first-class deck symbol so the reader can track it across multiple cards and question contexts.`
        : `- ${symbol.name} is intentionally deck-scoped.\n- Use it to compare recurring appearances across linked cards.\n- Expand this note as your personal symbolic system evolves.`,
    bodyJson: null,
    summary: `${symbol.name} starter motif.`,
    tags: ["symbol", "starter"],
    sourceIds: [STARTER_SOURCE_ID],
    sortOrder: 1,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildCardSymbols(): DeckLibraryCardSymbol[] {
  return THOTH_SYMBOL_LIBRARY.flatMap((symbol) =>
    symbol.linkedCards.map((cardId, index) => ({
      id: toId("link", `${cardId}:${symbol.symbolId}`),
      cardId,
      symbolId: symbol.symbolId,
      sortOrder: index + 1,
      placementHintJson: null,
      linkNote: null,
    }))
  );
}

function cloneDeck(deck: DeckLibraryDeck): DeckLibraryDeck {
  return JSON.parse(JSON.stringify(deck)) as DeckLibraryDeck;
}

export function createThothStarterDeck(summary: DeckSummary): DeckLibraryDeck {
  const cards = buildThothCards();
  const symbols = buildSymbols();
  const cardSymbols = buildCardSymbols();
  const knowledgeSources = buildKnowledgeSources();
  const cardInformationEntries = buildCardEntries(cards);
  const symbolInformationEntries = buildSymbolEntries(symbols);

  return {
    ...summary,
    knowledgeVersion: 1,
    initializationMode: "starter_content",
    initializerKey: "starter:thoth",
    originExportDigest: null,
    symbolCount: symbols.length,
    cards,
    symbols,
    cardSymbols,
    knowledgeSources,
    cardInformationEntries,
    symbolInformationEntries,
  };
}

export function createThothEmptyDeck(
  summary: DeckSummary,
  options?: { id?: string; name?: string }
): DeckLibraryDeck {
  const now = currentIso();
  const starterDeck = createThothStarterDeck(summary);
  const name = options?.name ?? `${summary.name} Empty Template`;

  return {
    ...starterDeck,
    id: options?.id ?? toId("deck", `empty-${now}`),
    name,
    description: "Knowledge-empty clone of the Thoth roster for custom authorship.",
    knowledgeVersion: 0,
    initializationMode: "empty_template",
    initializerKey: "template:thoth-empty",
    symbolCount: 0,
    symbols: [],
    cardSymbols: [],
    knowledgeSources: [],
    cardInformationEntries: [],
    symbolInformationEntries: [],
  };
}

export function createDeckFromSummary(summary: DeckSummary): DeckLibraryDeck {
  if (summary.id === "thoth") {
    return createThothStarterDeck(summary);
  }

  return {
    ...summary,
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
  };
}

export function cloneDeckLibraryDeck(deck: DeckLibraryDeck): DeckLibraryDeck {
  return cloneDeck(deck);
}
