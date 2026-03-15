import { Injectable } from "@nestjs/common";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { getProviderConnectionsRuntimeConfig } from "./provider-connections-runtime-config.js";

@Injectable()
export class ProviderSecretsService {
  private readonly secretKey = createHash("sha256")
    .update(getProviderConnectionsRuntimeConfig().credentialSecret)
    .digest();

  encryptSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
      "v1",
      iv.toString("base64"),
      authTag.toString("base64"),
      encrypted.toString("base64"),
    ].join(":");
  }

  maskApiKey(secret: string): string {
    const lastFour = secret.slice(-4);
    if (secret.startsWith("sk-")) {
      return `sk-...${lastFour}`;
    }

    return `••••${lastFour}`;
  }
}
