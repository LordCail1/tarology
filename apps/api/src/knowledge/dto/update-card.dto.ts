import { IsArray, IsOptional, IsString, MaxLength } from "class-validator";
import type { UpdateCardRequest } from "@tarology/shared";

export class UpdateCardDto implements UpdateCardRequest {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  shortLabel?: string | null;

  @IsOptional()
  metadataJson?: unknown | null;

  @IsOptional()
  @IsArray()
  linkedSymbolIds?: string[];

  @IsOptional()
  @IsArray()
  entries?: UpdateCardRequest["entries"];
}
