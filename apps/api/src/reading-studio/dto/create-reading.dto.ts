import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import type { CreateReadingRequest } from "@tarology/shared";

const CANVAS_MODES = ["freeform", "grid"] as const;

export class CreateReadingDto implements CreateReadingRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  rootQuestion!: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  deckId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  deckSpecVersion!: string;

  @IsOptional()
  @IsIn(CANVAS_MODES)
  canvasMode?: CreateReadingRequest["canvasMode"];
}
