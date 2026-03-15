import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import type { StartProviderAccountConnectionRequest } from "@tarology/shared";

const MODEL_PROVIDERS = ["openai"] as const;

export class StartProviderAccountConnectionDto
  implements StartProviderAccountConnectionRequest
{
  @IsIn(MODEL_PROVIDERS)
  provider!: StartProviderAccountConnectionRequest["provider"];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  makeDefault?: boolean;
}
