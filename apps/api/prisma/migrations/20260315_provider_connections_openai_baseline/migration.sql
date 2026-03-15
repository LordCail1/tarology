CREATE TYPE "ModelProvider" AS ENUM ('openai');

CREATE TYPE "ProviderCredentialMode" AS ENUM ('api_key', 'provider_account');

CREATE TYPE "ProviderConnectionStatus" AS ENUM ('active', 'pending', 'needs_attention');

CREATE TABLE "provider_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "ModelProvider" NOT NULL,
    "credential_mode" "ProviderCredentialMode" NOT NULL,
    "status" "ProviderConnectionStatus" NOT NULL,
    "display_name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "last_validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "provider_credentials" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "encrypted_secret" TEXT NOT NULL,
    "secret_hint" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "provider_connections_user_id_updated_at_idx"
ON "provider_connections"("user_id", "updated_at" DESC);

CREATE UNIQUE INDEX "provider_credentials_connection_id_key"
ON "provider_credentials"("connection_id");

ALTER TABLE "provider_connections"
ADD CONSTRAINT "provider_connections_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_credentials"
ADD CONSTRAINT "provider_credentials_connection_id_fkey"
FOREIGN KEY ("connection_id") REFERENCES "provider_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
