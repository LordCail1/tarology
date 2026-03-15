import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import type { CreateApiKeyProviderConnectionRequest } from "@tarology/shared";

const MODEL_PROVIDERS = ["openai"] as const;

export class CreateApiKeyProviderConnectionDto
  implements CreateApiKeyProviderConnectionRequest
{
  @IsIn(MODEL_PROVIDERS)
  provider!: CreateApiKeyProviderConnectionRequest["provider"];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  apiKey!: string;

  @IsOptional()
  @IsBoolean()
  makeDefault?: boolean;
}
