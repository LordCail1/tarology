import { IsArray, IsOptional, IsString, MaxLength } from "class-validator";
import type { UpdateSymbolRequest } from "@tarology/shared";

export class UpdateSymbolDto implements UpdateSymbolRequest {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

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
  linkedCardIds?: string[];

  @IsOptional()
  @IsArray()
  entries?: UpdateSymbolRequest["entries"];
}
