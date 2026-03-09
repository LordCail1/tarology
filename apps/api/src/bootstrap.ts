import {
  ValidationPipe,
  type INestApplication,
} from "@nestjs/common";
import session from "express-session";
import passport from "passport";
import {
  SESSION_COOKIE_NAME,
  getIdentityRuntimeConfig,
} from "./identity/identity-runtime-config.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function configureApp(app: INestApplication): void {
  const config = getIdentityRuntimeConfig();

  app.enableCors({
    origin: [config.webAppUrl],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.use(
    session({
      name: SESSION_COOKIE_NAME,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.secureCookies,
        maxAge: SEVEN_DAYS_MS,
      },
    })
  );

  app.use(passport.initialize());
}
