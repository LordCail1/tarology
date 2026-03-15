import { IsArray, IsOptional, IsString, MaxLength } from "class-validator";
import type { CreateSymbolRequest } from "@tarology/shared";

export class CreateSymbolDto implements CreateSymbolRequest {
  @IsString()
  @MaxLength(64)
  deckId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  symbolId?: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  shortLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  metadataJson?: unknown | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linkedCardIds?: string[];

  @IsOptional()
  @IsArray()
  entries?: CreateSymbolRequest["entries"];
}
