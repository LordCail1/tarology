import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "../src/database/database-runtime-config.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: getDatabaseUrl(),
  }),
});

const THOTH_DECK = {
  id: "thoth",
  ownerUserId: null,
  name: "Thoth Tarot",
  description:
    "Legacy shared starter source for the Aleister Crowley Thoth Tarot deck.",
  deckSpecVersion: "thoth-v1",
  knowledgeVersion: 1,
  initializationMode: "starter_content" as const,
  initializerKey: "thoth",
  originExportDigest: null,
  previewImageUrl: "/images/cards/thoth/TheSun.jpg",
  backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
  cardCount: 78,
};

async function main() {
  await prisma.deck.upsert({
    where: { id: THOTH_DECK.id },
    update: THOTH_DECK,
    create: THOTH_DECK,
  });
}

void main()
  .catch((error) => {
    console.error("Prisma seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
