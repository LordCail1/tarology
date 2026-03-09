import "express-session";
import type { AuthenticatedUser } from "@tarology/shared";

declare module "express-session" {
  interface SessionData {
    user?: AuthenticatedUser;
    returnTo?: string;
  }
}
