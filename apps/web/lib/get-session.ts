import { headers } from "next/headers";
import { getServerApiBaseUrl } from "./api-origin";

export interface AuthenticatedUser {
  userId: string;
  provider: "google";
  providerSubject: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface GetSessionResponse {
  authenticated: true;
  user: AuthenticatedUser;
}

export async function getSession(): Promise<GetSessionResponse | null> {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie");
  const apiBaseUrl = getServerApiBaseUrl();

  try {
    const response = await fetch(`${apiBaseUrl}/v1/auth/session`, {
      method: "GET",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as GetSessionResponse;
  } catch {
    return null;
  }
}
