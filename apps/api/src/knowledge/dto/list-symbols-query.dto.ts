import { IsOptional, IsString, MaxLength } from "class-validator";

export class ListSymbolsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  deckId?: string;
}
