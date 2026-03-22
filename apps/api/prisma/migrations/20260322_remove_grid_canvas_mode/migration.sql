UPDATE "reading_cards" AS "card"
SET
  "freeform_x_px" = ROUND((28 + LEAST(GREATEST("card"."grid_column", 0), 3) * 230.5)::numeric),
  "freeform_y_px" = ROUND((28 + LEAST(GREATEST("card"."grid_row", 0), 2) * 200.6666666667)::numeric),
  "freeform_stack_order" = LEAST(GREATEST("card"."grid_row", 0), 2) * 10
    + LEAST(GREATEST("card"."grid_column", 0), 3)
    + 1
FROM "readings" AS "reading"
WHERE "reading"."id" = "card"."reading_id"
  AND "reading"."canvas_mode" = 'grid';

ALTER TABLE "readings"
DROP COLUMN "canvas_mode";

ALTER TABLE "reading_cards"
DROP COLUMN "grid_column",
DROP COLUMN "grid_row";
