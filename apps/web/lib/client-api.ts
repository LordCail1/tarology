import type {
  CreateReadingRequest,
  CreateReadingResponse,
  GetDecksResponse,
  GetPreferencesResponse,
  GetProfileResponse,
  GetReadingResponse,
  GetSessionResponse,
  ListReadingsResponse,
  ReadingCommandRequest,
  ReadingCommandResponse,
  UpdatePreferencesRequest,
} from "@tarology/shared";
import { getClientApiBaseUrl } from "./api-origin";

export class ClientApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly kind: "http" | "network" | "timeout" = "http"
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

interface ClientApiRequestOptions {
  timeoutMs?: number;
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

async function fetchClientApi(
  path: string,
  init?: Omit<RequestInit, "credentials" | "cache">,
  options?: ClientApiRequestOptions
): Promise<Response> {
  const controller = options?.timeoutMs ? new AbortController() : null;
  const timeoutId =
    controller && options?.timeoutMs
      ? window.setTimeout(() => controller.abort(), options.timeoutMs)
      : null;

  try {
    return await fetch(`${getClientApiBaseUrl()}${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: controller?.signal,
    });
  } catch (error) {
    if (controller && error instanceof Error && error.name === "AbortError") {
      throw new ClientApiError(
        0,
        `Request to ${path} timed out. Please try again.`,
        "timeout"
      );
    }

    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : `Request to ${path} failed before the server responded.`;

    throw new ClientApiError(0, message, "network");
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function requestJson<T>(
  path: string,
  init?: Omit<RequestInit, "credentials" | "cache">,
  options?: ClientApiRequestOptions
): Promise<T> {
  const response = await fetchClientApi(path, init, options);

  if (!response.ok) {
    throw new ClientApiError(response.status, await readErrorMessage(response));
  }

  return (await response.json()) as T;
}

export async function fetchSession(options?: ClientApiRequestOptions): Promise<GetSessionResponse | null> {
  const response = await fetchClientApi("/v1/auth/session", {
    method: "GET",
  }, options);

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new ClientApiError(response.status, await readErrorMessage(response));
  }

  return (await response.json()) as GetSessionResponse;
}

export function fetchProfile(options?: ClientApiRequestOptions): Promise<GetProfileResponse> {
  return requestJson<GetProfileResponse>("/v1/profile", { method: "GET" }, options);
}

export function fetchPreferences(options?: ClientApiRequestOptions): Promise<GetPreferencesResponse> {
  return requestJson<GetPreferencesResponse>("/v1/preferences", { method: "GET" }, options);
}

export function fetchDecks(options?: ClientApiRequestOptions): Promise<GetDecksResponse> {
  return requestJson<GetDecksResponse>("/v1/decks", { method: "GET" }, options);
}

export function fetchReadings(): Promise<ListReadingsResponse> {
  return requestJson<ListReadingsResponse>("/v1/readings", { method: "GET" });
}

export function fetchReading(readingId: string): Promise<GetReadingResponse> {
  return requestJson<GetReadingResponse>(`/v1/readings/${readingId}`, { method: "GET" });
}

export function postCreateReading(
  payload: CreateReadingRequest,
  idempotencyKey: string
): Promise<CreateReadingResponse> {
  return requestJson<CreateReadingResponse>("/v1/readings", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}

export function postReadingCommand(
  readingId: string,
  payload: ReadingCommandRequest,
  idempotencyKey: string
): Promise<ReadingCommandResponse> {
  return requestJson<ReadingCommandResponse>(`/v1/readings/${readingId}/commands`, {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
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

export function isTransientClientApiError(error: unknown): boolean {
  return (
    error instanceof ClientApiError &&
    (error.kind === "network" || error.kind === "timeout")
  );
}
