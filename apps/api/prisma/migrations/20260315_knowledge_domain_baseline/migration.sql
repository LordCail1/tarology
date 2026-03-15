CREATE TYPE "DeckInitializationMode" AS ENUM ('starter_content', 'empty_template', 'imported_clone');
CREATE TYPE "KnowledgeEntryFormat" AS ENUM ('plain_text', 'markdown', 'json');
CREATE TYPE "KnowledgeSourceKind" AS ENUM (
    'reader_note',
    'starter_content',
    'imported_reference',
    'manual_reference',
    'external_enrichment'
);

ALTER TABLE "Deck"
RENAME COLUMN "specVersion" TO "deckSpecVersion";

ALTER TABLE "Deck"
ADD COLUMN "ownerUserId" TEXT,
ADD COLUMN "knowledgeVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "initializationMode" "DeckInitializationMode" NOT NULL DEFAULT 'starter_content',
ADD COLUMN "initializerKey" TEXT,
ADD COLUMN "originExportDigest" TEXT;

ALTER TABLE "Deck"
ALTER COLUMN "previewImageUrl" DROP NOT NULL,
ALTER COLUMN "backImageUrl" DROP NOT NULL;

UPDATE "Deck"
SET "initializerKey" = COALESCE("initializerKey", "id");

CREATE INDEX "Deck_ownerUserId_updatedAt_idx"
ON "Deck"("ownerUserId", "updatedAt" DESC);

ALTER TABLE "Deck"
ADD CONSTRAINT "Deck_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortLabel" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "faceImageUrl" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Symbol" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortLabel" TEXT,
    "description" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Symbol_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CardSymbol" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "cardRecordId" TEXT NOT NULL,
    "symbolRecordId" TEXT NOT NULL,
    "sortOrder" INTEGER,
    "placementHintJson" JSONB,
    "linkNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardSymbol_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CardInformationEntry" (
    "id" TEXT NOT NULL,
    "cardRecordId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "format" "KnowledgeEntryFormat" NOT NULL,
    "bodyText" TEXT,
    "bodyJson" JSONB,
    "summary" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardInformationEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SymbolInformationEntry" (
    "id" TEXT NOT NULL,
    "symbolRecordId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "format" "KnowledgeEntryFormat" NOT NULL,
    "bodyText" TEXT,
    "bodyJson" JSONB,
    "summary" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SymbolInformationEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "kind" "KnowledgeSourceKind" NOT NULL,
    "title" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "author" TEXT,
    "publisher" TEXT,
    "url" TEXT,
    "citationText" TEXT,
    "publishedAt" TIMESTAMP(3),
    "rightsNote" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeckExport" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "exporterUserId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "digest" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeckExport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Card_deckId_cardId_key" ON "Card"("deckId", "cardId");
CREATE UNIQUE INDEX "Card_deckId_sortOrder_key" ON "Card"("deckId", "sortOrder");
CREATE INDEX "Card_deckId_sortOrder_idx" ON "Card"("deckId", "sortOrder");
CREATE UNIQUE INDEX "Symbol_deckId_symbolId_key" ON "Symbol"("deckId", "symbolId");
CREATE INDEX "Symbol_deckId_name_idx" ON "Symbol"("deckId", "name");
CREATE UNIQUE INDEX "CardSymbol_cardRecordId_symbolRecordId_key" ON "CardSymbol"("cardRecordId", "symbolRecordId");
CREATE INDEX "CardSymbol_deckId_sortOrder_idx" ON "CardSymbol"("deckId", "sortOrder");
CREATE UNIQUE INDEX "CardInformationEntry_cardRecordId_entryId_key" ON "CardInformationEntry"("cardRecordId", "entryId");
CREATE INDEX "CardInformationEntry_cardRecordId_sortOrder_idx" ON "CardInformationEntry"("cardRecordId", "sortOrder");
CREATE UNIQUE INDEX "SymbolInformationEntry_symbolRecordId_entryId_key" ON "SymbolInformationEntry"("symbolRecordId", "entryId");
CREATE INDEX "SymbolInformationEntry_symbolRecordId_sortOrder_idx" ON "SymbolInformationEntry"("symbolRecordId", "sortOrder");
CREATE UNIQUE INDEX "KnowledgeSource_deckId_sourceId_key" ON "KnowledgeSource"("deckId", "sourceId");
CREATE INDEX "KnowledgeSource_deckId_kind_idx" ON "KnowledgeSource"("deckId", "kind");
CREATE UNIQUE INDEX "DeckExport_deckId_digest_key" ON "DeckExport"("deckId", "digest");
CREATE INDEX "DeckExport_deckId_createdAt_idx" ON "DeckExport"("deckId", "createdAt" DESC);

ALTER TABLE "Card"
ADD CONSTRAINT "Card_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Symbol"
ADD CONSTRAINT "Symbol_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CardSymbol"
ADD CONSTRAINT "CardSymbol_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CardSymbol"
ADD CONSTRAINT "CardSymbol_cardRecordId_fkey" FOREIGN KEY ("cardRecordId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CardSymbol"
ADD CONSTRAINT "CardSymbol_symbolRecordId_fkey" FOREIGN KEY ("symbolRecordId") REFERENCES "Symbol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CardInformationEntry"
ADD CONSTRAINT "CardInformationEntry_cardRecordId_fkey" FOREIGN KEY ("cardRecordId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SymbolInformationEntry"
ADD CONSTRAINT "SymbolInformationEntry_symbolRecordId_fkey" FOREIGN KEY ("symbolRecordId") REFERENCES "Symbol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KnowledgeSource"
ADD CONSTRAINT "KnowledgeSource_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeckExport"
ADD CONSTRAINT "DeckExport_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeckExport"
ADD CONSTRAINT "DeckExport_exporterUserId_fkey" FOREIGN KEY ("exporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
