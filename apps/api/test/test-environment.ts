import type { AuthenticatedUser } from "@tarology/shared";
import { PrismaService } from "../src/database/prisma.service.js";
import {
  THOTH_DECK_ID,
  THOTH_SPEC_VERSION,
} from "../src/reading-studio/domain/thoth-deck-spec.js";
import { StarterDeckTemplatesService } from "../src/knowledge/starter-deck-templates.service.js";

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

  return databaseUrl;
}

export async function createTestPrisma(): Promise<PrismaService> {
  configureApiTestEnvironment();
  const prisma = new PrismaService();
  await prisma.$connect();
  return prisma;
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.deckExport.deleteMany();
  await prisma.cardSymbol.deleteMany();
  await prisma.cardInformationEntry.deleteMany();
  await prisma.symbolInformationEntry.deleteMany();
  await prisma.knowledgeSource.deleteMany();
  await prisma.card.deleteMany();
  await prisma.symbol.deleteMany();
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
      ownerUserId: null,
      name: "Thoth Tarot",
      description:
        "Legacy shared starter source for the Aleister Crowley Thoth Tarot deck.",
      deckSpecVersion: THOTH_SPEC_VERSION,
      knowledgeVersion: 1,
      initializationMode: "starter_content",
      initializerKey: THOTH_DECK_ID,
      originExportDigest: null,
      previewImageUrl: "/images/cards/thoth/TheSun.jpg",
      backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
      cardCount: 78,
    },
    create: {
      id: THOTH_DECK_ID,
      ownerUserId: null,
      name: "Thoth Tarot",
      description:
        "Legacy shared starter source for the Aleister Crowley Thoth Tarot deck.",
      deckSpecVersion: THOTH_SPEC_VERSION,
      knowledgeVersion: 1,
      initializationMode: "starter_content",
      initializerKey: THOTH_DECK_ID,
      originExportDigest: null,
      previewImageUrl: "/images/cards/thoth/TheSun.jpg",
      backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
      cardCount: 78,
    },
  });
}

export async function ensureUserShell(
  prisma: PrismaService,
  user: AuthenticatedUser
): Promise<void> {
  await prisma.user.upsert({
    where: { id: user.userId },
    update: {
      email: user.email,
    },
    create: {
      id: user.userId,
      email: user.email,
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.userId },
    update: {
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    create: {
      userId: user.userId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
  });

  await prisma.userPreference.upsert({
    where: { userId: user.userId },
    update: {},
    create: {
      userId: user.userId,
    },
  });
}

export async function ensureOwnedStarterDeck(
  prisma: PrismaService,
  user: AuthenticatedUser
): Promise<string> {
  await ensureUserShell(prisma, user);

  const existingDeck = await prisma.deck.findFirst({
    where: {
      ownerUserId: user.userId,
      initializerKey: THOTH_DECK_ID,
      initializationMode: "starter_content",
    },
    select: { id: true },
  });

  if (existingDeck) {
    return existingDeck.id;
  }

  const starterTemplateService = new StarterDeckTemplatesService();
  const seed = starterTemplateService.getStarterDeckSeed(THOTH_DECK_ID);
  const deckId = `${user.userId}-thoth-starter`;

  await prisma.deck.create({
    data: {
      id: deckId,
      ownerUserId: user.userId,
      name: seed.name,
      description: seed.description,
      deckSpecVersion: seed.deckSpecVersion,
      knowledgeVersion: 1,
      initializationMode: seed.initializationMode,
      initializerKey: seed.initializerKey,
      originExportDigest: null,
      previewImageUrl: seed.previewImageUrl,
      backImageUrl: seed.backImageUrl,
      cardCount: seed.cards.length,
    },
  });

  await prisma.card.createMany({
    data: seed.cards.map((card) => ({
      id: `${deckId}-${card.cardId}`,
      deckId,
      cardId: card.cardId,
      name: card.name,
      shortLabel: card.shortLabel,
      sortOrder: card.sortOrder,
      faceImageUrl: card.faceImageUrl,
      metadataJson: card.metadataJson,
    })),
  });

  if (seed.knowledgeSources.length > 0) {
    await prisma.knowledgeSource.createMany({
      data: seed.knowledgeSources.map((source) => ({
        id: `${deckId}-${source.sourceId}`,
        deckId,
        sourceId: source.sourceId,
        kind: source.kind,
        title: source.title,
        capturedAt: new Date(source.capturedAt),
        author: source.author,
        publisher: source.publisher,
        url: source.url,
        citationText: source.citationText,
        publishedAt: source.publishedAt ? new Date(source.publishedAt) : null,
        rightsNote: source.rightsNote,
        metadataJson: source.metadataJson,
      })),
    });
  }

  await prisma.symbol.createMany({
    data: seed.symbols.map((symbol) => ({
      id: `${deckId}-${symbol.symbolId}`,
      deckId,
      symbolId: symbol.symbolId,
      name: symbol.name,
      shortLabel: symbol.shortLabel,
      description: symbol.description,
      metadataJson: symbol.metadataJson,
    })),
  });

  if (seed.cardInformationEntries.length > 0) {
    await prisma.cardInformationEntry.createMany({
      data: seed.cardInformationEntries.map((entry) => ({
        id: `${deckId}-${entry.cardId}-${entry.entryId}`,
        cardRecordId: `${deckId}-${entry.cardId}`,
        entryId: entry.entryId,
        label: entry.label,
        format: entry.format,
        bodyText: entry.bodyText,
        bodyJson: entry.bodyJson,
        summary: entry.summary,
        tags: entry.tags,
        sourceIds: entry.sourceIds,
        sortOrder: entry.sortOrder,
        archivedAt: null,
      })),
    });
  }

  if (seed.symbolInformationEntries.length > 0) {
    await prisma.symbolInformationEntry.createMany({
      data: seed.symbolInformationEntries.map((entry) => ({
        id: `${deckId}-${entry.symbolId}-${entry.entryId}`,
        symbolRecordId: `${deckId}-${entry.symbolId}`,
        entryId: entry.entryId,
        label: entry.label,
        format: entry.format,
        bodyText: entry.bodyText,
        bodyJson: entry.bodyJson,
        summary: entry.summary,
        tags: entry.tags,
        sourceIds: entry.sourceIds,
        sortOrder: entry.sortOrder,
        archivedAt: null,
      })),
    });
  }

  if (seed.cardSymbols.length > 0) {
    await prisma.cardSymbol.createMany({
      data: seed.cardSymbols.map((link) => ({
        id: `${deckId}-${link.cardId}-${link.symbolId}`,
        deckId,
        cardRecordId: `${deckId}-${link.cardId}`,
        symbolRecordId: `${deckId}-${link.symbolId}`,
        sortOrder: link.sortOrder,
        placementHintJson: link.placementHintJson,
        linkNote: link.linkNote,
      })),
    });
  }

  return deckId;
}
