import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUser } from "@tarology/shared";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | null => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.session?.user ?? null;
  }
);
