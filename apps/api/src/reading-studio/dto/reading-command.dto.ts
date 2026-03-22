import {
  IsIn,
  IsInt,
  IsObject,
  IsUUID,
  Min,
} from "class-validator";
import type { ReadingCommandRequest } from "@tarology/shared";

const READING_COMMAND_TYPES = [
  "archive_reading",
  "reopen_reading",
  "delete_reading",
  "switch_canvas_mode",
  "move_card",
  "rotate_card",
  "flip_card",
] as const;

export type ReadingCommandDtoType = (typeof READING_COMMAND_TYPES)[number];

export class ReadingCommandDto {
  @IsUUID()
  commandId!: string;

  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsIn(READING_COMMAND_TYPES)
  type!: ReadingCommandDtoType;

  @IsObject()
  payload!: ReadingCommandRequest["payload"] | Record<string, unknown>;
}
