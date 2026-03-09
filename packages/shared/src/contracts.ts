export const TOTAL_TAROT_CARDS = 78;
export const SHUFFLE_ALGORITHM_VERSION = "seeded-fisher-yates-v1";

export type AppAuthProvider = "google";

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

export interface CreateReadingRequest {
  rootQuestion: string;
  deckSpecVersion: string;
}

export interface CardAssignment {
  deckIndex: number;
  cardId: number;
  assignedReversal: boolean;
}

export interface CreateReadingResponse {
  readingId: string;
  rootQuestion: string;
  deckSpecVersion: string;
  shuffleAlgorithmVersion: string;
  seedCommitment: string;
  orderHash: string;
  assignments: CardAssignment[];
  createdAt: string;
}
