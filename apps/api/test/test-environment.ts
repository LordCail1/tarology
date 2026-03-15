import type { AuthenticatedUser } from "@tarology/shared";
import { PrismaService } from "../src/database/prisma.service.js";
import {
  THOTH_DECK_ID,
  THOTH_SPEC_VERSION,
} from "../src/reading-studio/domain/thoth-deck-spec.js";

export const TEST_USER: AuthenticatedUser = {
  userId: "11111111-1111-1111-1111-111111111111",
  provider: "google",
  providerSubject: "test-provider-subject",
  email: "reader@example.com",
  displayName: "Reader",
  avatarUrl: null,
};

export const OTHER_TEST_USER: AuthenticatedUser = {
  userId: "22222222-2222-2222-2222-222222222222",
  provider: "google",
  providerSubject: "other-provider-subject",
  email: "other-reader@example.com",
  displayName: "Other Reader",
  avatarUrl: null,
};

export function configureApiTestEnvironment(): string {
  const databaseUrl =
    process.env.TEST_DATABASE_URL?.trim() ?? process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("Set TEST_DATABASE_URL or DATABASE_URL before running API tests.");
  }

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = databaseUrl;
  process.env.TEST_DATABASE_URL ??= databaseUrl;
  process.env.SESSION_SECRET = "test-session-secret";
  process.env.WEB_APP_URL = "http://localhost:3000";
  process.env.API_BASE_URL = "http://localhost:3001";
  process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_OAUTH_CALLBACK_URL =
    "http://localhost:3001/v1/auth/google/callback";
  process.env.PROVIDER_CREDENTIAL_SECRET = "test-provider-credential-secret";
  process.env.OPENAI_PROVIDER_ACCOUNT_ALLOWLIST = "";

  return databaseUrl;
}

export async function createTestPrisma(): Promise<PrismaService> {
  configureApiTestEnvironment();
  const prisma = new PrismaService();
  await prisma.$connect();
  return prisma;
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.providerCredential.deleteMany();
  await prisma.providerConnection.deleteMany();
  await prisma.readingCommandReceipt.deleteMany();
  await prisma.readingCreateReceipt.deleteMany();
  await prisma.readingSnapshot.deleteMany();
  await prisma.readingEvent.deleteMany();
  await prisma.readingCard.deleteMany();
  await prisma.reading.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.authIdentity.deleteMany();
  await prisma.user.deleteMany();
  await prisma.deck.deleteMany();
}

export async function ensureThothDeck(prisma: PrismaService): Promise<void> {
  await prisma.deck.upsert({
    where: { id: THOTH_DECK_ID },
    update: {
      name: "Thoth Tarot",
      description:
        "The Aleister Crowley Thoth Tarot deck with richly layered esoteric symbolism.",
      specVersion: THOTH_SPEC_VERSION,
      previewImageUrl: "/images/cards/thoth/TheSun.jpg",
      backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
      cardCount: 78,
    },
    create: {
      id: THOTH_DECK_ID,
      name: "Thoth Tarot",
      description:
        "The Aleister Crowley Thoth Tarot deck with richly layered esoteric symbolism.",
      specVersion: THOTH_SPEC_VERSION,
      previewImageUrl: "/images/cards/thoth/TheSun.jpg",
      backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
      cardCount: 78,
    },
  });
}
