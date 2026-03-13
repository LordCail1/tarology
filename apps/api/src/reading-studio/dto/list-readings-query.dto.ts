import { IsIn, IsOptional } from "class-validator";
import type { ReadingListStatusFilter } from "@tarology/shared";

const READING_LIST_STATUSES = ["all", "active", "archived"] as const;

export class ListReadingsQueryDto {
  @IsOptional()
  @IsIn(READING_LIST_STATUSES)
  status?: ReadingListStatusFilter;
}
