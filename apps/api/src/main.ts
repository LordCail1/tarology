import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { configureApp } from "./bootstrap.js";
import { getIdentityRuntimeConfig } from "./identity/identity-runtime-config.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const { apiBaseUrl } = getIdentityRuntimeConfig();
  const defaultPort = Number(new URL(apiBaseUrl).port || "3001");
  const port = Number(process.env.PORT ?? defaultPort);
  await app.listen(port);
}

void bootstrap();
