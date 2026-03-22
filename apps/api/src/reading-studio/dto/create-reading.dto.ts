import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import type { CreateReadingRequest } from "@tarology/shared";

type LegacyCanvasMode = "freeform" | "grid";

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

  // Backward-compatibility shim for cached older clients during rollout.
  @IsOptional()
  @IsIn(["freeform", "grid"] satisfies LegacyCanvasMode[])
  canvasMode?: LegacyCanvasMode;
}
