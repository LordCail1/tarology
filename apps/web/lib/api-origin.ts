const DEFAULT_API_BASE_URL = "http://localhost:3001";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getServerApiBaseUrl(): string {
  return stripTrailingSlash(
    process.env.API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      DEFAULT_API_BASE_URL
  );
}

export function getClientApiBaseUrl(): string {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
  );
}
