import { IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { CompleteProviderAccountConnectionRequest } from "@tarology/shared";

const MODEL_PROVIDERS = ["openai"] as const;

export class CompleteProviderAccountConnectionDto
  implements CompleteProviderAccountConnectionRequest
{
  @IsIn(MODEL_PROVIDERS)
  provider!: CompleteProviderAccountConnectionRequest["provider"];

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  challengeToken!: string;
}
