CREATE TABLE "readings" (
    "id" UUID NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "root_question" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "deck_id" TEXT,
    "deck_spec_version" TEXT NOT NULL,
    "shuffle_algorithm_version" TEXT NOT NULL,
    "seed_commitment" TEXT NOT NULL,
    "order_hash" TEXT NOT NULL,
    "canvas_mode" TEXT NOT NULL DEFAULT 'freeform',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reading_cards" (
    "reading_id" UUID NOT NULL,
    "deck_index" INTEGER NOT NULL,
    "card_id" INTEGER NOT NULL,
    "assigned_reversal" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reading_cards_pkey" PRIMARY KEY ("reading_id", "deck_index")
);

CREATE TABLE "reading_events" (
    "id" UUID NOT NULL,
    "reading_id" UUID NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "command_id" TEXT,
    "idempotency_key" TEXT,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reading_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reading_snapshots" (
    "id" UUID NOT NULL,
    "reading_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "projection" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reading_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reading_create_receipts" (
    "id" UUID NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "reading_id" UUID NOT NULL,
    "response_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reading_create_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reading_command_receipts" (
    "id" UUID NOT NULL,
    "reading_id" UUID NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "command_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "resulting_version" INTEGER NOT NULL,
    "response_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reading_command_receipts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "readings_owner_user_id_updated_at_idx"
ON "readings"("owner_user_id", "updated_at" DESC);

CREATE UNIQUE INDEX "reading_events_reading_id_version_key"
ON "reading_events"("reading_id", "version");

CREATE UNIQUE INDEX "reading_snapshots_reading_id_version_key"
ON "reading_snapshots"("reading_id", "version");

CREATE UNIQUE INDEX "reading_create_receipts_owner_user_id_idempotency_key_key"
ON "reading_create_receipts"("owner_user_id", "idempotency_key");

CREATE UNIQUE INDEX "reading_command_receipts_reading_id_command_id_key"
ON "reading_command_receipts"("reading_id", "command_id");

CREATE UNIQUE INDEX "reading_command_receipts_reading_id_idempotency_key_key"
ON "reading_command_receipts"("reading_id", "idempotency_key");

ALTER TABLE "reading_cards"
ADD CONSTRAINT "reading_cards_reading_id_fkey"
FOREIGN KEY ("reading_id") REFERENCES "readings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reading_events"
ADD CONSTRAINT "reading_events_reading_id_fkey"
FOREIGN KEY ("reading_id") REFERENCES "readings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reading_snapshots"
ADD CONSTRAINT "reading_snapshots_reading_id_fkey"
FOREIGN KEY ("reading_id") REFERENCES "readings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reading_create_receipts"
ADD CONSTRAINT "reading_create_receipts_reading_id_fkey"
FOREIGN KEY ("reading_id") REFERENCES "readings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reading_command_receipts"
ADD CONSTRAINT "reading_command_receipts_reading_id_fkey"
FOREIGN KEY ("reading_id") REFERENCES "readings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
