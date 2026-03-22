import type { ReadingLifecycleStatus } from "@tarology/shared";

export type PanelSide = "left" | "right";
export type AnalysisTab = "threads" | "interpretations";

export type ReadingStatus = ReadingLifecycleStatus;
export type ReadingHistoryFilter = "all" | ReadingStatus;
export type InterpretationStatus = "ready" | "running" | "queued";

export interface ReadingHistoryItem {
  id: string;
  title: string;
  createdAtIso: string;
  createdAtLabel: string;
  updatedAtIso: string;
  cardCount: number;
  status: ReadingStatus;
  version: number;
  deckId: string | null;
  deckSpecVersion: string;
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

export interface FreeformPosition {
  xPx: number;
  yPx: number;
  stackOrder: number;
}

export interface ReadingCanvasCard {
  id: string;
  label: string;
  assignedReversal: boolean;
  isFaceUp: boolean;
  rotationDeg: number;
  freeform: FreeformPosition;
}

export interface ReadingCanvasState {
  cards: ReadingCanvasCard[];
}

export interface ReadingStudioWorkspace {
  reading: ReadingHistoryItem;
  threads: QuestionThreadItem[];
  interpretations: InterpretationHistoryItem[];
  canvas: ReadingCanvasState;
}

export interface ReadingStudioSnapshot {
  activeReadingId: string | null;
  history: ReadingHistoryItem[];
  workspaces: Record<string, ReadingStudioWorkspace>;
}

export interface ReadingStudioLayoutPreferences {
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidthPx: number;
  rightWidthPx: number;
}

export interface ReadingStudioPreferenceAdapter {
  readLayoutPreferences(): Promise<ReadingStudioLayoutPreferences>;
  writeLayoutPreferences(next: ReadingStudioLayoutPreferences): Promise<void>;
}

export interface ReadingStudioDataSource {
  loadStudio(): Promise<ReadingStudioSnapshot>;
  setActiveReading(readingId: string): Promise<ReadingStudioWorkspace>;
  createReading(rootQuestion: string): Promise<ReadingStudioWorkspace>;
  applyWorkspaceAction(
    readingId: string,
    currentVersion: number,
    action: Extract<
      ReadingStudioAction,
      {
        type:
          | "workspace.cardMoved"
          | "workspace.cardRotated"
          | "workspace.cardFlipped";
        }
      >
  ): Promise<ReadingStudioWorkspace>;
  saveWorkspace?(
    readingId: string,
    workspace: ReadingStudioWorkspace
  ): Promise<void>;
}

export type ReadingStudioAction =
  | { type: "layout.panelToggled"; side: PanelSide }
  | { type: "layout.panelResized"; side: PanelSide; widthPx: number }
  | { type: "workspace.readingActivated"; readingId: string }
  | { type: "workspace.cardSelected"; cardId: string | null }
  | {
      type: "workspace.cardMoved";
      cardId: string;
      freeform: Pick<FreeformPosition, "xPx" | "yPx">;
    }
  | { type: "workspace.cardRotated"; cardId: string; deltaDeg: number }
  | { type: "workspace.cardFlipped"; cardId: string };
