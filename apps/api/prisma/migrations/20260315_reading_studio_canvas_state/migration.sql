ALTER TABLE "reading_cards"
ADD COLUMN "is_face_up" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rotation_deg" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "freeform_x_px" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "freeform_y_px" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "freeform_stack_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "grid_column" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "grid_row" INTEGER NOT NULL DEFAULT 0;

-- Backfill pre-existing readings so legacy cards restore into the same initial
-- layout used for newly created durable readings instead of collapsing at 0,0.
UPDATE "reading_cards"
SET
  "freeform_x_px" = 40 + (MOD("deck_index", 10) * 24),
  "freeform_y_px" = 56 + (("deck_index" / 10) * 18),
  "freeform_stack_order" = "deck_index" + 1,
  "grid_column" = MOD("deck_index", 10),
  "grid_row" = "deck_index" / 10;
