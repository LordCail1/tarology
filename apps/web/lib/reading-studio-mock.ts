export type ReadingStatus = "active" | "paused" | "complete";
export type ReadingHistoryFilter = "all" | ReadingStatus;
export type InterpretationStatus = "ready" | "running" | "queued";

export interface ReadingHistoryItem {
  id: string;
  title: string;
  createdAtLabel: string;
  cardCount: number;
  status: ReadingStatus;
}

export interface QuestionThreadItem {
  id: string;
  parentId: string | null;
  label: string;
  depth: number;
  updatedAtLabel: string;
}

export interface InterpretationHistoryItem {
  id: string;
  threadId: string;
  groupName: string;
  summary: string;
  status: InterpretationStatus;
  createdAtLabel: string;
  citationCount: number;
}

export const readingHistoryMock: ReadingHistoryItem[] = [
  {
    id: "rdg_001",
    title: "Career realignment and confidence",
    createdAtLabel: "Today, 09:42",
    cardCount: 5,
    status: "active",
  },
  {
    id: "rdg_002",
    title: "Relationship clarity check-in",
    createdAtLabel: "Yesterday, 20:14",
    cardCount: 3,
    status: "paused",
  },
  {
    id: "rdg_003",
    title: "Spring direction spread",
    createdAtLabel: "Mar 05, 2026",
    cardCount: 7,
    status: "complete",
  },
  {
    id: "rdg_004",
    title: "Creative project momentum",
    createdAtLabel: "Mar 01, 2026",
    cardCount: 4,
    status: "complete",
  },
];

export const questionThreadsMock: QuestionThreadItem[] = [
  {
    id: "th_root",
    parentId: null,
    label: "What should I focus on this month?",
    depth: 0,
    updatedAtLabel: "Updated 8m ago",
  },
  {
    id: "th_energy",
    parentId: "th_root",
    label: "Where is my energy currently blocked?",
    depth: 1,
    updatedAtLabel: "Updated 4m ago",
  },
  {
    id: "th_action",
    parentId: "th_root",
    label: "What practical step can I take first?",
    depth: 1,
    updatedAtLabel: "Updated 2m ago",
  },
  {
    id: "th_reflect",
    parentId: "th_action",
    label: "How do I stay consistent if progress is slow?",
    depth: 2,
    updatedAtLabel: "Updated now",
  },
];

export const interpretationHistoryMock: InterpretationHistoryItem[] = [
  {
    id: "ir_001",
    threadId: "th_root",
    groupName: "Whole table",
    summary:
      "Momentum improves when uncertainty is acknowledged first, then translated into one visible action.",
    status: "ready",
    createdAtLabel: "09:50",
    citationCount: 6,
  },
  {
    id: "ir_002",
    threadId: "th_energy",
    groupName: "The Star + Five of Pentacles",
    summary: "Current pattern points to recovery fatigue and cautious optimism rebuilding over time.",
    status: "ready",
    createdAtLabel: "09:55",
    citationCount: 4,
  },
  {
    id: "ir_003",
    threadId: "th_action",
    groupName: "Ace of Wands focus",
    summary: "Queued synthesis with practical next-step framing.",
    status: "queued",
    createdAtLabel: "09:57",
    citationCount: 0,
  },
];
