export const TOTAL_TAROT_CARDS = 78;
export const SHUFFLE_ALGORITHM_VERSION = "seeded-fisher-yates-v1";

export type AppAuthProvider = "google";
export type CanvasMode = "freeform" | "grid";
export type DeckInitializationMode =
  | "starter_content"
  | "empty_template"
  | "imported_clone";
export type KnowledgeEntryFormat = "plain_text" | "markdown" | "json";
export type KnowledgeSourceKind =
  | "reader_note"
  | "starter_content"
  | "imported_reference"
  | "manual_reference"
  | "external_enrichment";
export type ReadingLifecycleStatus = "active" | "archived" | "deleted";
export type ReadingListStatusFilter = "all" | "active" | "archived";
export type ModelProvider = "openai";
export type ProviderCredentialMode = "api_key" | "provider_account";
export type ProviderConnectionStatus = "active" | "pending" | "needs_attention";
export type ReadingCommandType =
  | "archive_reading"
  | "reopen_reading"
  | "delete_reading"
  | "switch_canvas_mode"
  | "move_card"
  | "rotate_card"
  | "flip_card";
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
  knowledgeVersion: number;
  initializationMode: DeckInitializationMode;
  initializerKey: string | null;
  previewImageUrl: string | null;
  backImageUrl: string | null;
  cardCount: number;
  symbolCount: number;
}

export interface GetDecksResponse {
  decks: DeckSummary[];
}

export interface KnowledgeSourceDto {
  id: string;
  deckId: string;
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
  metadataJson: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeSourceWriteDto {
  sourceId?: string;
  kind: KnowledgeSourceKind;
  title: string;
  capturedAt?: string;
  author?: string | null;
  publisher?: string | null;
  url?: string | null;
  citationText?: string | null;
  publishedAt?: string | null;
  rightsNote?: string | null;
  metadataJson?: unknown | null;
}

export interface KnowledgeEntryDto {
  id: string;
  entryId: string;
  label: string;
  format: KnowledgeEntryFormat;
  bodyText: string | null;
  bodyJson: unknown | null;
  summary: string | null;
  tags: string[];
  sourceIds: string[];
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderCapability {
  provider: ModelProvider;
  supportsApiKey: boolean;
  supportsProviderAccount: boolean;
  supportsStreaming: boolean;
  supportsBackground: boolean;
  providerAccountNotice: string | null;
}

export interface ProviderConnectionSummary {
  id: string;
  provider: ModelProvider;
  credentialMode: ProviderCredentialMode;
  status: ProviderConnectionStatus;
  displayName: string;
  isDefault: boolean;
  maskedCredentialHint: string | null;
  lastValidatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeEntryWriteDto {
  entryId?: string;
  label: string;
  format: KnowledgeEntryFormat;
  bodyText?: string | null;
  bodyJson?: unknown | null;
  summary?: string | null;
  tags?: string[];
  sourceIds?: string[];
  sortOrder: number;
  archived?: boolean;
}

export interface CardSummaryDto {
  id: string;
  deckId: string;
  cardId: string;
  name: string;
  shortLabel: string | null;
  sortOrder: number;
  faceImageUrl: string | null;
  metadataJson: unknown | null;
  entryCount: number;
  linkedSymbolCount: number;
}

export interface SymbolSummaryDto {
  id: string;
  deckId: string;
  symbolId: string;
  name: string;
  shortLabel: string | null;
  description: string | null;
  metadataJson: unknown | null;
  entryCount: number;
  linkedCardCount: number;
}

export interface DeckDetail extends DeckSummary {
  sources: KnowledgeSourceDto[];
  cards: CardSummaryDto[];
  symbols: SymbolSummaryDto[];
}

export interface GetDeckResponse {
  deck: DeckDetail;
}

export interface CreateDeckRequest {
  initializationMode: Exclude<DeckInitializationMode, "imported_clone">;
  initializerKey: string;
  name?: string;
  description?: string | null;
}

export interface CreateDeckResponse {
  deck: DeckSummary;
}

export interface UpdateDeckRequest {
  name?: string;
  description?: string | null;
  sources?: KnowledgeSourceWriteDto[];
}

export interface UpdateDeckResponse {
  deck: DeckDetail;
}

export interface CardDetail extends CardSummaryDto {
  entries: KnowledgeEntryDto[];
  linkedSymbols: SymbolSummaryDto[];
}

export interface GetCardResponse {
  card: CardDetail;
}

export interface UpdateCardRequest {
  name?: string;
  shortLabel?: string | null;
  metadataJson?: unknown | null;
  linkedSymbolIds?: string[];
  entries?: KnowledgeEntryWriteDto[];
}

export interface UpdateCardResponse {
  card: CardDetail;
}

export interface SymbolDetail extends SymbolSummaryDto {
  entries: KnowledgeEntryDto[];
  linkedCards: CardSummaryDto[];
}

export interface GetSymbolsResponse {
  symbols: SymbolSummaryDto[];
}

export interface GetSymbolResponse {
  symbol: SymbolDetail;
}

export interface CreateSymbolRequest {
  deckId: string;
  symbolId?: string;
  name: string;
  shortLabel?: string | null;
  description?: string | null;
  metadataJson?: unknown | null;
  linkedCardIds?: string[];
  entries?: KnowledgeEntryWriteDto[];
}

export interface CreateSymbolResponse {
  symbol: SymbolDetail;
}

export interface UpdateSymbolRequest {
  name?: string;
  shortLabel?: string | null;
  description?: string | null;
  metadataJson?: unknown | null;
  linkedCardIds?: string[];
  entries?: KnowledgeEntryWriteDto[];
}

export interface UpdateSymbolResponse {
  symbol: SymbolDetail;
}

export interface DeckExportDeckPayload {
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
}

export interface DeckExportCardPayload {
  cardId: string;
  name: string;
  sortOrder: number;
  shortLabel: string | null;
  faceImageUrl: string | null;
  metadataJson: unknown | null;
}

export interface DeckExportSymbolPayload {
  symbolId: string;
  name: string;
  shortLabel: string | null;
  description: string | null;
  metadataJson: unknown | null;
}

export interface DeckExportCardSymbolPayload {
  cardId: string;
  symbolId: string;
  sortOrder: number | null;
  placementHintJson: unknown | null;
  linkNote: string | null;
}

export interface DeckExportKnowledgeEntryPayload {
  entryId: string;
  label: string;
  format: KnowledgeEntryFormat;
  bodyText: string | null;
  bodyJson: unknown | null;
  summary: string | null;
  tags: string[];
  sourceIds: string[];
  sortOrder: number;
  archivedAt: string | null;
}

export interface DeckExportCardKnowledgeEntryPayload
  extends DeckExportKnowledgeEntryPayload {
  cardId: string;
}

export interface DeckExportSymbolKnowledgeEntryPayload
  extends DeckExportKnowledgeEntryPayload {
  symbolId: string;
}

export interface DeckExportEnvelope {
  format: "tarology.deck.export";
  version: 1;
  exportedAt: string;
  deck: DeckExportDeckPayload;
  cards: DeckExportCardPayload[];
  symbols: DeckExportSymbolPayload[];
  cardSymbols: DeckExportCardSymbolPayload[];
  knowledgeSources: KnowledgeSourceDto[];
  cardInformationEntries: DeckExportCardKnowledgeEntryPayload[];
  symbolInformationEntries: DeckExportSymbolKnowledgeEntryPayload[];
}

export type ExportDeckResponse = DeckExportEnvelope;
export type ImportDeckRequest = DeckExportEnvelope;

export interface ImportDeckResponse {
  deck: DeckSummary;
}

export interface GetProviderConnectionsResponse {
  capabilities: ProviderCapability[];
  connections: ProviderConnectionSummary[];
}

export interface CreateApiKeyProviderConnectionRequest {
  provider: ModelProvider;
  displayName?: string;
  apiKey: string;
  makeDefault?: boolean;
}

export interface StartProviderAccountConnectionRequest {
  provider: ModelProvider;
  displayName?: string;
  makeDefault?: boolean;
}

export interface StartProviderAccountConnectionResponse {
  provider: ModelProvider;
  challengeToken: string;
  expiresAt: string;
  flow: "internal_allowlisted";
  message: string;
}

export interface CompleteProviderAccountConnectionRequest {
  provider: ModelProvider;
  challengeToken: string;
}

export interface UpdateProviderConnectionRequest {
  displayName?: string;
  makeDefault?: boolean;
}

export interface ProviderConnectionMutationResponse {
  connection: ProviderConnectionSummary;
}

export interface DeleteProviderConnectionResponse {
  success: true;
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
  deckSpecVersion: string;
  canvasMode?: CanvasMode;
}
export interface ReadingCardAssignment {
  deckIndex: number;
  cardId: string;
  assignedReversal: boolean;
}

export type CardAssignment = ReadingCardAssignment;

export interface FreeformPositionDto {
  xPx: number;
  yPx: number;
  stackOrder: number;
}

export interface GridPositionDto {
  column: number;
  row: number;
}

export interface ReadingCanvasCardState extends ReadingCardAssignment {
  isFaceUp: boolean;
  rotationDeg: number;
  freeform: FreeformPositionDto;
  grid: GridPositionDto;
}

export interface ReadingCanvasStateDto {
  activeMode: CanvasMode;
  cards: ReadingCanvasCardState[];
}

export interface ReadingSummary {
  readingId: string;
  rootQuestion: string;
  deckId: string | null;
  deckSpecVersion: string;
  cardCount: number;
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
  canvas: ReadingCanvasStateDto;
}

export interface CreateReadingResponse {
  readingId: string;
  rootQuestion: string;
  deckId: string | null;
  deckSpecVersion: string;
  cardCount: number;
  canvasMode: CanvasMode;
  status: ReadingLifecycleStatus;
  version: number;
  shuffleAlgorithmVersion: string;
  seedCommitment: string;
  orderHash: string;
  assignments: ReadingCardAssignment[];
  canvas: ReadingCanvasStateDto;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface ListReadingsResponse {
  readings: ReadingSummary[];
}

export type GetReadingResponse = ReadingDetail;

export interface SwitchCanvasModePayload {
  canvasMode: CanvasMode;
}

export interface MoveCardPayload {
  cardId: string;
  freeform?: Pick<FreeformPositionDto, "xPx" | "yPx">;
  grid?: GridPositionDto;
}

export interface RotateCardPayload {
  cardId: string;
  deltaDeg: number;
}

export interface FlipCardPayload {
  cardId: string;
}

export type ReadingCommandPayload =
  | Record<string, never>
  | SwitchCanvasModePayload
  | MoveCardPayload
  | RotateCardPayload
  | FlipCardPayload;

export interface ReadingCommandRequest {
  commandId: string;
  expectedVersion: number;
  type: ReadingCommandType;
  payload: ReadingCommandPayload;
}

export interface ReadingCommandResponse {
  reading: ReadingDetail;
}

export interface ApiConflictResponse {
  code: ApiConflictCode;
  message: string;
  currentVersion?: number;
}
