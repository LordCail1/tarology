export type CanvasMode = "freeform" | "grid";
export type PanelSide = "left" | "right";
export type AnalysisTab = "threads" | "interpretations";

export type ReadingStatus = "active" | "paused" | "complete";
export type ReadingHistoryFilter = "all" | ReadingStatus;
export type InterpretationStatus = "ready" | "running" | "queued";

export interface ReadingHistoryItem {
  id: string;
  title: string;
  createdAtIso: string;
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

export interface FreeformPosition {
  xPx: number;
  yPx: number;
  stackOrder: number;
}

export interface GridPosition {
  column: number;
  row: number;
}

export interface ReadingCanvasCard {
  id: string;
  label: string;
  assignedReversal: boolean;
  isFaceUp: boolean;
  rotationDeg: number;
  freeform: FreeformPosition;
  grid: GridPosition;
}

export interface ReadingCanvasState {
  activeMode: CanvasMode;
  cards: ReadingCanvasCard[];
}

export interface ReadingStudioWorkspace {
  reading: ReadingHistoryItem;
  threads: QuestionThreadItem[];
  interpretations: InterpretationHistoryItem[];
  canvas: ReadingCanvasState;
}

export interface ReadingStudioSnapshot {
  activeReadingId: string;
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
  saveWorkspace(readingId: string, workspace: ReadingStudioWorkspace): Promise<void>;
}

export type ReadingStudioAction =
  | { type: "layout.panelToggled"; side: PanelSide }
  | { type: "layout.panelResized"; side: PanelSide; widthPx: number }
  | { type: "workspace.readingActivated"; readingId: string }
  | { type: "workspace.modeSwitched"; mode: CanvasMode }
  | { type: "workspace.cardSelected"; cardId: string | null }
  | {
      type: "workspace.cardMoved";
      cardId: string;
      freeform?: Pick<FreeformPosition, "xPx" | "yPx">;
      grid?: GridPosition;
    }
  | { type: "workspace.cardRotated"; cardId: string; deltaDeg: number }
  | { type: "workspace.cardFlipped"; cardId: string };
