import { Injectable, NotFoundException } from "@nestjs/common";
import type { DeckInitializationMode, KnowledgeEntryFormat, KnowledgeSourceKind } from "@tarology/shared";
import {
  THOTH_DECK_ID,
  THOTH_DECK_SPEC,
  THOTH_SPEC_VERSION,
} from "../reading-studio/domain/thoth-deck-spec.js";

interface StarterCardSeed {
  cardId: string;
  name: string;
  shortLabel: string | null;
  sortOrder: number;
  faceImageUrl: string | null;
  metadataJson: Record<string, string>;
}

interface StarterSymbolSeed {
  symbolId: string;
  name: string;
  shortLabel: string | null;
  description: string | null;
  metadataJson: Record<string, string> | null;
}

interface StarterCardSymbolSeed {
  cardId: string;
  symbolId: string;
  sortOrder: number | null;
  placementHintJson: Record<string, string> | null;
  linkNote: string | null;
}

interface StarterKnowledgeSourceSeed {
  sourceId: string;
  kind: KnowledgeSourceKind;
  title: string;
  capturedAt: string;
  author: string | null;
  publisher: string | null;
  url: string | null;
  citationText: string | null;
  publishedAt: string | null;
  rightsNote: string | null;
  metadataJson: Record<string, string> | null;
}

interface StarterKnowledgeEntrySeed {
  entryId: string;
  label: string;
  format: KnowledgeEntryFormat;
  bodyText: string | null;
  bodyJson: Record<string, unknown> | null;
  summary: string | null;
  tags: string[];
  sourceIds: string[];
  sortOrder: number;
}

export interface StarterDeckSeed {
  initializerKey: string;
  initializationMode: Exclude<DeckInitializationMode, "imported_clone">;
  name: string;
  description: string;
  deckSpecVersion: string;
  previewImageUrl: string | null;
  backImageUrl: string | null;
  cards: StarterCardSeed[];
  symbols: StarterSymbolSeed[];
  cardSymbols: StarterCardSymbolSeed[];
  knowledgeSources: StarterKnowledgeSourceSeed[];
  cardInformationEntries: Array<StarterKnowledgeEntrySeed & { cardId: string }>;
  symbolInformationEntries: Array<StarterKnowledgeEntrySeed & { symbolId: string }>;
}

const STARTER_SOURCE_ID = "thoth-starter-bundle";

const THOTH_MAJOR_CARD_METADATA: Record<
  string,
  { name: string; fileName: string; shortLabel?: string }
> = {
  "the-fool": { name: "The Fool", fileName: "TheFool.jpg" },
  "the-magician": { name: "The Magician", fileName: "TheMagician.jpg" },
  "the-priestess": {
    name: "The Priestess",
    fileName: "TheHighPriestess.jpg",
    shortLabel: "Priestess",
  },
  "the-empress": { name: "The Empress", fileName: "TheEmpress.jpg" },
  "the-emperor": { name: "The Emperor", fileName: "TheEmperor.jpg" },
  "the-hierophant": { name: "The Hierophant", fileName: "TheHierophant.jpg" },
  "the-lovers": { name: "The Lovers", fileName: "TheLovers.jpg" },
  "the-chariot": { name: "The Chariot", fileName: "TheChariot.jpg" },
  adjustment: { name: "Adjustment", fileName: "Adjustment.jpg" },
  "the-hermit": { name: "The Hermit", fileName: "TheHermit.jpg" },
  "wheel-of-fortune": { name: "Wheel of Fortune", fileName: "WheelOfFortune.jpg" },
  lust: { name: "Lust", fileName: "Lust.jpg" },
  "the-hanged-man": { name: "The Hanged Man", fileName: "TheHangedMan.jpg" },
  death: { name: "Death", fileName: "Death.jpg" },
  art: { name: "Art", fileName: "Art.jpg" },
  "the-devil": { name: "The Devil", fileName: "TheDevil.jpg" },
  "the-tower": { name: "The Tower", fileName: "TheTower.jpg" },
  "the-star": { name: "The Star", fileName: "TheStar.jpg" },
  "the-moon": { name: "The Moon", fileName: "TheMoon.jpg" },
  "the-sun": { name: "The Sun", fileName: "TheSun.jpg" },
  "the-aeon": { name: "The Aeon", fileName: "TheAon.jpg" },
  "the-universe": { name: "The Universe", fileName: "TheUniverse.jpg" },
};

const THOTH_SYMBOL_SEEDS: Array<
  StarterSymbolSeed & {
    linkedCardIds: string[];
    entries: StarterKnowledgeEntrySeed[];
  }
> = [
  {
    symbolId: "solar-radiance",
    name: "Solar Radiance",
    shortLabel: "Sun",
    description: "Clarity, vitality, and visible illumination.",
    metadataJson: { element: "fire" },
    linkedCardIds: ["major:the-sun", "major:the-star", "major:the-fool"],
    entries: [
      {
        entryId: "core-theme",
        label: "core-theme",
        format: "plain_text",
        bodyText:
          "Starter symbol note: Solar Radiance highlights visibility, confidence, and the movement from hidden potential into expressed presence.",
        bodyJson: null,
        summary: "Visibility and life force.",
        tags: ["clarity", "vitality"],
        sourceIds: [STARTER_SOURCE_ID],
        sortOrder: 1,
      },
    ],
  },
  {
    symbolId: "lunar-tide",
    name: "Lunar Tide",
    shortLabel: "Moon",
    description: "Cycles, intuition, and changing emotional weather.",
    metadataJson: { element: "water" },
    linkedCardIds: ["major:the-moon", "major:the-priestess", "minor:cups:queen"],
    entries: [
      {
        entryId: "core-theme",
        label: "core-theme",
        format: "plain_text",
        bodyText:
          "Starter symbol note: Lunar Tide emphasizes sensitivity, pattern recognition, and the need to move through uncertainty without forcing certainty.",
        bodyJson: null,
        summary: "Intuition and changing conditions.",
        tags: ["intuition", "cycles"],
        sourceIds: [STARTER_SOURCE_ID],
        sortOrder: 1,
      },
    ],
  },
  {
    symbolId: "balance-scale",
    name: "Balance Scale",
    shortLabel: "Scale",
    description: "Calibration, proportion, and ethical adjustment.",
    metadataJson: { mode: "equilibrium" },
    linkedCardIds: ["major:adjustment", "major:art", "minor:swords:six"],
    entries: [
      {
        entryId: "core-theme",
        label: "core-theme",
        format: "plain_text",
        bodyText:
          "Starter symbol note: Balance Scale points to deliberate calibration, measured choice, and the practical work of restoring proportion.",
        bodyJson: null,
        summary: "Measured adjustment.",
        tags: ["balance", "proportion"],
        sourceIds: [STARTER_SOURCE_ID],
        sortOrder: 1,
      },
    ],
  },
  {
    symbolId: "serpent-current",
    name: "Serpent Current",
    shortLabel: "Serpent",
    description: "Transformation, instinct, and catalytic change.",
    metadataJson: { mode: "transformation" },
    linkedCardIds: ["major:lust", "major:death", "major:the-devil"],
    entries: [
      {
        entryId: "core-theme",
        label: "core-theme",
        format: "plain_text",
        bodyText:
          "Starter symbol note: Serpent Current marks intense life force, transformation, and the pressure to integrate instinct rather than deny it.",
        bodyJson: null,
        summary: "Transformation and instinct.",
        tags: ["change", "instinct"],
        sourceIds: [STARTER_SOURCE_ID],
        sortOrder: 1,
      },
    ],
  },
  {
    symbolId: "vessel",
    name: "Vessel",
    shortLabel: "Cup",
    description: "Containment, receptivity, and emotional holding.",
    metadataJson: { element: "water" },
    linkedCardIds: ["minor:cups:ace", "minor:cups:queen", "minor:cups:princess"],
    entries: [
      {
        entryId: "core-theme",
        label: "core-theme",
        format: "plain_text",
        bodyText:
          "Starter symbol note: Vessel points to what is being received, held, and protected in the emotional and relational field.",
        bodyJson: null,
        summary: "Containment and receptivity.",
        tags: ["emotion", "receptivity"],
        sourceIds: [STARTER_SOURCE_ID],
        sortOrder: 1,
      },
    ],
  },
  {
    symbolId: "wand-flame",
    name: "Wand Flame",
    shortLabel: "Flame",
    description: "Drive, initiation, and the visible spark of will.",
    metadataJson: { element: "fire" },
    linkedCardIds: ["minor:wands:ace", "minor:wands:six", "minor:wands:knight"],
    entries: [
      {
        entryId: "core-theme",
        label: "core-theme",
        format: "plain_text",
        bodyText:
          "Starter symbol note: Wand Flame emphasizes momentum, activated desire, and the courage required to move first.",
        bodyJson: null,
        summary: "Initiation and will.",
        tags: ["will", "action"],
        sourceIds: [STARTER_SOURCE_ID],
        sortOrder: 1,
      },
    ],
  },
  {
    symbolId: "blade-line",
    name: "Blade Line",
    shortLabel: "Blade",
    description: "Discernment, separation, and conceptual precision.",
    metadataJson: { element: "air" },
    linkedCardIds: ["minor:swords:ace", "minor:swords:queen", "major:the-magician"],
    entries: [
      {
        entryId: "core-theme",
        label: "core-theme",
        format: "plain_text",
        bodyText:
          "Starter symbol note: Blade Line marks the power of naming, cutting through noise, and distinguishing one pattern from another.",
        bodyJson: null,
        summary: "Discernment and precision.",
        tags: ["clarity", "discernment"],
        sourceIds: [STARTER_SOURCE_ID],
        sortOrder: 1,
      },
    ],
  },
  {
    symbolId: "disk-garden",
    name: "Disk Garden",
    shortLabel: "Garden",
    description: "Material cultivation, stewardship, and patient growth.",
    metadataJson: { element: "earth" },
    linkedCardIds: ["minor:disks:ace", "minor:disks:nine", "minor:disks:princess"],
    entries: [
      {
        entryId: "core-theme",
        label: "core-theme",
        format: "plain_text",
        bodyText:
          "Starter symbol note: Disk Garden points to what is being cultivated over time through stewardship, tending, and repeated practical care.",
        bodyJson: null,
        summary: "Stewardship and growth.",
        tags: ["earth", "cultivation"],
        sourceIds: [STARTER_SOURCE_ID],
        sortOrder: 1,
      },
    ],
  },
];

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildMinorName(rank: string, suit: string): string {
  return `${titleCase(rank)} of ${titleCase(suit)}`;
}

function buildMinorFileName(rank: string, suit: string): string {
  return `${titleCase(rank)}Of${titleCase(suit)}.jpg`;
}

function describeMinor(rank: string, suit: string): string {
  return `Starter note: ${titleCase(rank)} of ${titleCase(
    suit
  )} is framed as a ${suit}-colored pattern that asks the reader to notice how this rank expresses itself through everyday choices.`;
}

function describeReversalMinor(rank: string, suit: string): string {
  return `Starter note: reversed ${titleCase(rank)} of ${titleCase(
    suit
  )} asks where ${suit}-colored effort is stalled, inverted, or asking for a more reflective pace.`;
}

function describeMajor(cardName: string): string {
  return `Starter note: ${cardName} is treated as an archetypal pressure point in the reading, offering a clear theme the reader can interpret rather than a fixed prediction.`;
}

function describeReversalMajor(cardName: string): string {
  return `Starter note: reversed ${cardName} asks where the same archetypal force is obstructed, overplayed, or calling for a more grounded expression.`;
}

function describeSymbolism(cardName: string): string {
  return `Starter symbolism note: ${cardName} can be read through the recurring symbols linked to it in this deck, using those motifs to explain tone and emphasis instead of flattening the card into one meaning.`;
}

function toMajorCardSeed(cardKey: string, sortOrder: number): StarterCardSeed {
  const metadata = THOTH_MAJOR_CARD_METADATA[cardKey];
  return {
    cardId: `major:${cardKey}`,
    name: metadata.name,
    shortLabel: metadata.shortLabel ?? metadata.name,
    sortOrder,
    faceImageUrl: `/images/cards/${THOTH_DECK_ID}/${metadata.fileName}`,
    metadataJson: {
      arcana: "major",
      majorKey: cardKey,
    },
  };
}

function toMinorCardSeed(cardId: string, sortOrder: number): StarterCardSeed {
  const [, suit, rank] = cardId.split(":");
  return {
    cardId,
    name: buildMinorName(rank, suit),
    shortLabel: titleCase(rank),
    sortOrder,
    faceImageUrl: `/images/cards/${THOTH_DECK_ID}/${buildMinorFileName(rank, suit)}`,
    metadataJson: {
      arcana: "minor",
      suit,
      rank,
    },
  };
}

function buildThothCards(): StarterCardSeed[] {
  return THOTH_DECK_SPEC.cardIds.map((cardId, index) => {
    if (cardId.startsWith("major:")) {
      return toMajorCardSeed(cardId.replace("major:", ""), index);
    }

    return toMinorCardSeed(cardId, index);
  });
}

function buildCardEntries(cards: StarterCardSeed[]): Array<StarterKnowledgeEntrySeed & { cardId: string }> {
  return cards.flatMap((card) => {
    const isMajor = card.cardId.startsWith("major:");
    const majorKey = isMajor ? card.cardId.replace("major:", "") : null;
    const [_, suit = "", rank = ""] = card.cardId.split(":");

    return [
      {
        cardId: card.cardId,
        entryId: "core-theme",
        label: "core-theme",
        format: "plain_text",
        bodyText: isMajor
          ? describeMajor(card.name)
          : describeMinor(rank, suit),
        bodyJson: null,
        summary: `${card.name} in its direct expression.`,
        tags: isMajor ? ["major", "theme"] : [suit, rank],
        sourceIds: [STARTER_SOURCE_ID],
        sortOrder: 1,
      },
      {
        cardId: card.cardId,
        entryId: "reversed-notes",
        label: "reversed-notes",
        format: "plain_text",
        bodyText: isMajor
          ? describeReversalMajor(card.name)
          : describeReversalMinor(rank, suit),
        bodyJson: null,
        summary: `${card.name} when the pattern is inverted or blocked.`,
        tags: ["reversal", ...(isMajor ? [majorKey ?? "major"] : [suit])],
        sourceIds: [STARTER_SOURCE_ID],
        sortOrder: 2,
      },
      {
        cardId: card.cardId,
        entryId: "symbolism-notes",
        label: "symbolism-notes",
        format: "markdown",
        bodyText: describeSymbolism(card.name),
        bodyJson: null,
        summary: `${card.name} through linked symbols and motifs.`,
        tags: ["symbolism", ...(isMajor ? ["major"] : [suit])],
        sourceIds: [STARTER_SOURCE_ID],
        sortOrder: 3,
      },
    ];
  });
}

function buildStarterKnowledgeSources(): StarterKnowledgeSourceSeed[] {
  return [
    {
      sourceId: STARTER_SOURCE_ID,
      kind: "starter_content",
      title: "Tarology Thoth starter bundle",
      capturedAt: "2026-03-15T12:00:00.000Z",
      author: "Tarology",
      publisher: "Tarology",
      url: null,
      citationText:
        "Mock starter bundle used to provide a substantial baseline knowledge graph for the built-in Thoth deck.",
      publishedAt: null,
      rightsNote: "Internal starter content only.",
      metadataJson: {
        deck: THOTH_DECK_ID,
        version: THOTH_SPEC_VERSION,
      },
    },
  ];
}

function buildStarterCardSymbols(): StarterCardSymbolSeed[] {
  return THOTH_SYMBOL_SEEDS.flatMap((symbol) =>
    symbol.linkedCardIds.map((cardId, index) => ({
      cardId,
      symbolId: symbol.symbolId,
      sortOrder: index + 1,
      placementHintJson: null,
      linkNote: null,
    }))
  );
}

function buildSymbolInformationEntries(): Array<StarterKnowledgeEntrySeed & { symbolId: string }> {
  return THOTH_SYMBOL_SEEDS.flatMap((symbol) =>
    symbol.entries.map((entry) => ({
      ...entry,
      symbolId: symbol.symbolId,
    }))
  );
}

@Injectable()
export class StarterDeckTemplatesService {
  private readonly thothCards = buildThothCards();
  private readonly thothCardEntries = buildCardEntries(this.thothCards);
  private readonly starterKnowledgeSources = buildStarterKnowledgeSources();
  private readonly starterCardSymbols = buildStarterCardSymbols();
  private readonly starterSymbolEntries = buildSymbolInformationEntries();

  getStarterDeckSeed(initializerKey: string): StarterDeckSeed {
    if (initializerKey !== THOTH_DECK_ID) {
      throw new NotFoundException(`Starter deck "${initializerKey}" is not supported.`);
    }

    return {
      initializerKey,
      initializationMode: "starter_content",
      name: "Thoth Tarot",
      description:
        "The Aleister Crowley Thoth Tarot deck with mock starter knowledge, linked symbols, and source metadata.",
      deckSpecVersion: THOTH_SPEC_VERSION,
      previewImageUrl: "/images/cards/thoth/TheSun.jpg",
      backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
      cards: this.thothCards,
      symbols: THOTH_SYMBOL_SEEDS.map(({ linkedCardIds, entries, ...symbol }) => symbol),
      cardSymbols: this.starterCardSymbols,
      knowledgeSources: this.starterKnowledgeSources,
      cardInformationEntries: this.thothCardEntries,
      symbolInformationEntries: this.starterSymbolEntries,
    };
  }

  getEmptyTemplateSeed(initializerKey: string): StarterDeckSeed {
    const starterSeed = this.getStarterDeckSeed(initializerKey);

    return {
      ...starterSeed,
      initializationMode: "empty_template",
      name: `${starterSeed.name} (Empty Template)`,
      description:
        "A knowledge-empty owned deck instance with the full deterministic Thoth card roster and no starter symbols or notes.",
      symbols: [],
      cardSymbols: [],
      knowledgeSources: [],
      cardInformationEntries: [],
      symbolInformationEntries: [],
    };
  }
}
