const THOTH_MAJOR_ARCANA = [
  "the-fool",
  "the-magician",
  "the-priestess",
  "the-empress",
  "the-emperor",
  "the-hierophant",
  "the-lovers",
  "the-chariot",
  "adjustment",
  "the-hermit",
  "wheel-of-fortune",
  "lust",
  "the-hanged-man",
  "death",
  "art",
  "the-devil",
  "the-tower",
  "the-star",
  "the-moon",
  "the-sun",
  "the-aeon",
  "the-universe",
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

export const THOTH_DECK_ID = "thoth";
export const THOTH_SPEC_VERSION = "thoth-v1";

export interface TarotDeckSpec {
  deckId: string;
  specVersion: string;
  cardIds: readonly string[];
  cardCount: number;
}

function buildThothCardIds(): string[] {
  const majors = THOTH_MAJOR_ARCANA.map((cardKey) => `major:${cardKey}`);
  const minors = THOTH_SUITS.flatMap((suit) =>
    THOTH_MINOR_RANKS.map((rank) => `minor:${suit}:${rank}`)
  );
  return [...majors, ...minors];
}

export const THOTH_DECK_SPEC: TarotDeckSpec = {
  deckId: THOTH_DECK_ID,
  specVersion: THOTH_SPEC_VERSION,
  cardIds: buildThothCardIds(),
  cardCount: 78,
};
