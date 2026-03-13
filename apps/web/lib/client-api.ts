import type {
  GetDecksResponse,
  GetPreferencesResponse,
  GetProfileResponse,
  GetSessionResponse,
  UpdatePreferencesRequest,
} from "@tarology/shared";
import { getClientApiBaseUrl } from "./api-origin";

export class ClientApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as
      | { message?: string | string[]; error?: string }
      | undefined;

    if (Array.isArray(body?.message)) {
      return body.message.join(", ");
    }

    if (typeof body?.message === "string") {
      return body.message;
    }

    if (typeof body?.error === "string") {
      return body.error;
    }
  } catch {
    // Fall back to a generic message when the error body is empty or non-JSON.
  }

  return `Request failed with status ${response.status}.`;
}

async function requestJson<T>(
  path: string,
  init?: Omit<RequestInit, "credentials" | "cache">
): Promise<T> {
  const response = await fetch(`${getClientApiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new ClientApiError(response.status, await readErrorMessage(response));
  }

  return (await response.json()) as T;
}

export async function fetchSession(): Promise<GetSessionResponse | null> {
  const response = await fetch(`${getClientApiBaseUrl()}/v1/auth/session`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new ClientApiError(response.status, await readErrorMessage(response));
  }

  return (await response.json()) as GetSessionResponse;
}

export function fetchProfile(): Promise<GetProfileResponse> {
  return requestJson<GetProfileResponse>("/v1/profile", { method: "GET" });
}

export function fetchPreferences(): Promise<GetPreferencesResponse> {
  return requestJson<GetPreferencesResponse>("/v1/preferences", { method: "GET" });
}

export function fetchDecks(): Promise<GetDecksResponse> {
  return requestJson<GetDecksResponse>("/v1/decks", { method: "GET" });
}

export function patchPreferences(
  payload: UpdatePreferencesRequest
): Promise<GetPreferencesResponse> {
  return requestJson<GetPreferencesResponse>("/v1/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function isUnauthorizedClientApiError(error: unknown): boolean {
  return error instanceof ClientApiError && error.status === 401;
}
