import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { CreateReadingRequest } from "@tarology/shared";

export class CreateReadingDto implements CreateReadingRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  rootQuestion!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  deckSpecVersion!: string;
}

