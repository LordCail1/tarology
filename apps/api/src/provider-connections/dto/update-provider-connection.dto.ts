import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import type { UpdateProviderConnectionRequest } from "@tarology/shared";

export class UpdateProviderConnectionDto implements UpdateProviderConnectionRequest {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  makeDefault?: boolean;
}
