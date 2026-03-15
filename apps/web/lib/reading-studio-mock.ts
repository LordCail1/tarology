import type {
  InterpretationHistoryItem,
  QuestionThreadItem,
  ReadingCanvasCard,
  ReadingHistoryItem,
  ReadingStudioSnapshot,
  ReadingStudioWorkspace,
} from "./reading-studio-types";

export type {
  AnalysisTab,
  CanvasMode,
  InterpretationHistoryItem,
  InterpretationStatus,
  PanelSide,
  QuestionThreadItem,
  ReadingCanvasCard,
  ReadingHistoryFilter,
  ReadingHistoryItem,
  ReadingStatus,
  ReadingStudioAction,
  ReadingStudioLayoutPreferences,
  ReadingStudioSnapshot,
  ReadingStudioWorkspace,
} from "./reading-studio-types";

const readingHistorySeed: ReadingHistoryItem[] = [
  {
    id: "rdg_001",
    title: "Career realignment and confidence",
    createdAtIso: "2026-03-08T09:42:00.000-05:00",
    createdAtLabel: "Today, 09:42",
    updatedAtIso: "2026-03-08T09:42:00.000-05:00",
    cardCount: 5,
    status: "active",
    version: 1,
    deckId: "thoth",
    deckSpecVersion: "thoth-v1",
    canvasMode: "freeform",
  },
  {
    id: "rdg_002",
    title: "Relationship clarity check-in",
    createdAtIso: "2026-03-07T20:14:00.000-05:00",
    createdAtLabel: "Yesterday, 20:14",
    updatedAtIso: "2026-03-07T20:14:00.000-05:00",
    cardCount: 5,
    status: "archived",
    version: 2,
    deckId: "thoth",
    deckSpecVersion: "thoth-v1",
    canvasMode: "freeform",
  },
  {
    id: "rdg_003",
    title: "Spring direction spread",
    createdAtIso: "2026-03-05T13:30:00.000-05:00",
    createdAtLabel: "Mar 05, 2026",
    updatedAtIso: "2026-03-05T13:30:00.000-05:00",
    cardCount: 5,
    status: "archived",
    version: 3,
    deckId: "thoth",
    deckSpecVersion: "thoth-v1",
    canvasMode: "freeform",
  },
  {
    id: "rdg_004",
    title: "Creative project momentum sprint",
    createdAtIso: "2026-03-03T18:10:00.000-05:00",
    createdAtLabel: "Mar 03, 2026",
    updatedAtIso: "2026-03-03T18:10:00.000-05:00",
    cardCount: 5,
    status: "active",
    version: 4,
    deckId: "thoth",
    deckSpecVersion: "thoth-v1",
    canvasMode: "freeform",
  },
  {
    id: "rdg_005",
    title: "Crossroads spread review",
    createdAtIso: "2026-02-24T08:25:00.000-05:00",
    createdAtLabel: "Feb 24, 2026",
    updatedAtIso: "2026-02-24T08:25:00.000-05:00",
    cardCount: 5,
    status: "archived",
    version: 5,
    deckId: "thoth",
    deckSpecVersion: "thoth-v1",
    canvasMode: "freeform",
  },
];

const cardLabelSeed = [
  "The Magician",
  "The Star",
  "Six of Swords",
  "Queen of Pentacles",
  "Ace of Wands",
];

function createCards(readingId: string, readingIndex: number): ReadingCanvasCard[] {
  const xOffset = readingIndex * 12;
  const yOffset = readingIndex * 10;

  return cardLabelSeed.map((label, cardIndex) => ({
    id: `${readingId}_card_${cardIndex + 1}`,
    label,
    assignedReversal: (readingIndex + cardIndex) % 2 === 1,
    isFaceUp: true,
    rotationDeg: (readingIndex * 7 + cardIndex * 5) % 360,
    freeform: {
      xPx: 40 + cardIndex * 148 + xOffset,
      yPx: 72 + ((cardIndex + readingIndex) % 2) * 38 + yOffset,
      stackOrder: cardIndex + 1,
    },
    grid: {
      column: cardIndex % 4,
      row: Math.floor(cardIndex / 4),
    },
  }));
}

function createThreads(reading: ReadingHistoryItem): QuestionThreadItem[] {
  return [
    {
      id: `${reading.id}_th_root`,
      parentId: null,
      label: `What is the core pattern in "${reading.title}"?`,
      depth: 0,
      updatedAtLabel: "Updated 12m ago",
    },
    {
      id: `${reading.id}_th_block`,
      parentId: `${reading.id}_th_root`,
      label: "Where is the current tension asking for patience?",
      depth: 1,
      updatedAtLabel: "Updated 6m ago",
    },
    {
      id: `${reading.id}_th_action`,
      parentId: `${reading.id}_th_root`,
      label: "What practical next step feels grounded?",
      depth: 1,
      updatedAtLabel: "Updated 3m ago",
    },
    {
      id: `${reading.id}_th_reflect`,
      parentId: `${reading.id}_th_action`,
      label: "How do I keep momentum without forcing certainty?",
      depth: 2,
      updatedAtLabel: "Updated now",
    },
  ];
}

function createInterpretations(
  reading: ReadingHistoryItem,
  threads: QuestionThreadItem[]
): InterpretationHistoryItem[] {
  return [
    {
      id: `${reading.id}_ir_001`,
      threadId: threads[0].id,
      groupName: "Whole table",
      summary:
        "The spread suggests progress comes from turning scattered effort into one visible commitment.",
      status: "ready",
      createdAtLabel: "09:50",
      citationCount: 6,
    },
    {
      id: `${reading.id}_ir_002`,
      threadId: threads[1].id,
      groupName: `${cardLabelSeed[1]} + ${cardLabelSeed[3]}`,
      summary:
        "Recovery themes stay strongest when care and discipline reinforce each other instead of competing.",
      status: "ready",
      createdAtLabel: "09:55",
      citationCount: 4,
    },
    {
      id: `${reading.id}_ir_003`,
      threadId: threads[2].id,
      groupName: cardLabelSeed[4],
      summary: "Queued synthesis with practical next-step framing.",
      status: "queued",
      createdAtLabel: "09:57",
      citationCount: 0,
    },
  ];
}

function createWorkspace(
  reading: ReadingHistoryItem,
  readingIndex: number
): ReadingStudioWorkspace {
  const threads = createThreads(reading);
  const interpretations = createInterpretations(reading, threads);

  return {
    reading,
    threads,
    interpretations,
    canvas: {
      activeMode: "freeform",
      cards: createCards(reading.id, readingIndex),
    },
  };
}

export const readingStudioSeedSnapshot: ReadingStudioSnapshot = {
  activeReadingId: readingHistorySeed[0].id,
  history: readingHistorySeed,
  workspaces: Object.fromEntries(
    readingHistorySeed.map((reading, index) => [reading.id, createWorkspace(reading, index)])
  ),
};

export const readingHistoryMock = readingStudioSeedSnapshot.history;
const seedActiveReadingId =
  readingStudioSeedSnapshot.activeReadingId ?? readingStudioSeedSnapshot.history[0]?.id;

if (!seedActiveReadingId) {
  throw new Error("Reading Studio seed snapshot requires at least one reading.");
}

export const questionThreadsMock =
  readingStudioSeedSnapshot.workspaces[seedActiveReadingId].threads;
export const interpretationHistoryMock =
  readingStudioSeedSnapshot.workspaces[seedActiveReadingId].interpretations;
