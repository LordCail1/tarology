export const TOTAL_TAROT_CARDS = 78;
export const SHUFFLE_ALGORITHM_VERSION = "seeded-fisher-yates-v1";

export type AppAuthProvider = "google";
export type CanvasMode = "freeform" | "grid";
export type ReadingLifecycleStatus = "active" | "archived" | "deleted";
export type ReadingListStatusFilter = "all" | "active" | "archived";
export type ReadingCommandType =
  | "archive_reading"
  | "reopen_reading"
  | "delete_reading";
export type ApiConflictCode =
  | "version_conflict"
  | "idempotency_conflict"
  | "command_conflict";

export interface AuthenticatedUser {
  userId: string;
  provider: AppAuthProvider;
  providerSubject: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface GetSessionResponse {
  authenticated: true;
  user: AuthenticatedUser;
}

export interface LogoutResponse {
  success: true;
}

export interface DeckSummary {
  id: string;
  name: string;
  description: string | null;
  specVersion: string;
  previewImageUrl: string;
  backImageUrl: string;
  cardCount: number;
}

export interface GetDecksResponse {
  decks: DeckSummary[];
}

export interface ProfileShellDto {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  provider: AppAuthProvider;
  createdAt: string;
}

export interface GetProfileResponse {
  profile: ProfileShellDto;
}

export interface UserPreferencesDto {
  defaultDeckId: string | null;
  defaultDeck: DeckSummary | null;
  onboardingComplete: boolean;
  updatedAt: string;
}

export interface GetPreferencesResponse {
  preferences: UserPreferencesDto;
}

export interface UpdatePreferencesRequest {
  defaultDeckId: string;
}

export interface CreateReadingRequest {
  rootQuestion: string;
  deckId?: string;
  deckSpecVersion?: string;
  canvasMode?: CanvasMode;
}

export interface ReadingCardAssignment {
  deckIndex: number;
  cardId: string;
  assignedReversal: boolean;
}

export type CardAssignment = ReadingCardAssignment;

export interface ReadingSummary {
  readingId: string;
  rootQuestion: string;
  deckId: string | null;
  deckSpecVersion: string;
  canvasMode: CanvasMode;
  status: ReadingLifecycleStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface ReadingDetail extends ReadingSummary {
  shuffleAlgorithmVersion: string;
  seedCommitment: string;
  orderHash: string;
  assignments: ReadingCardAssignment[];
}

export interface CreateReadingResponse {
  readingId: string;
  rootQuestion: string;
  deckId: string | null;
  deckSpecVersion: string;
  canvasMode: CanvasMode;
  status: ReadingLifecycleStatus;
  version: number;
  shuffleAlgorithmVersion: string;
  seedCommitment: string;
  orderHash: string;
  assignments: ReadingCardAssignment[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface ListReadingsResponse {
  readings: ReadingSummary[];
}

export type GetReadingResponse = ReadingDetail;

export interface ReadingCommandRequest {
  commandId: string;
  expectedVersion: number;
  type: ReadingCommandType;
  payload: Record<string, never>;
}

export interface ReadingCommandResponse {
  reading: ReadingDetail;
}

export interface ApiConflictResponse {
  code: ApiConflictCode;
  message: string;
  currentVersion?: number;
}
