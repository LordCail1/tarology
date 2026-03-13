import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { UpdatePreferencesRequest } from "@tarology/shared";

export class UpdatePreferencesDto implements UpdatePreferencesRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  defaultDeckId!: string;
}
