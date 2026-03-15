import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import type { CreateDeckRequest } from "@tarology/shared";

export class CreateDeckDto implements CreateDeckRequest {
  @IsIn(["starter_content", "empty_template"])
  initializationMode!: "starter_content" | "empty_template";

  @IsString()
  @MaxLength(64)
  initializerKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;
}
