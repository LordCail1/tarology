import { IsArray, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import type { UpdateDeckRequest } from "@tarology/shared";

export class UpdateDeckDto implements UpdateDeckRequest {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsArray()
  sources?: UpdateDeckRequest["sources"];
}
