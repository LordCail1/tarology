"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GetSessionResponse } from "@tarology/shared";
import { getClientApiBaseUrl } from "../../lib/api-origin";
import { ReadingStudioShell } from "./reading-studio-shell";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

async function fetchClientSession(): Promise<GetSessionResponse | null> {
  try {
    const response = await fetch(`${getClientApiBaseUrl()}/v1/auth/session`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (response.status === 401 || !response.ok) {
      return null;
    }

    return (await response.json()) as GetSessionResponse;
  } catch {
    return null;
  }
}

export function ReadingAuthGate() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const session = await fetchClientSession();
      if (cancelled) {
        return;
      }

      if (!session) {
        setAuthStatus("unauthenticated");
        router.replace("/login?returnTo=%2Freading");
        return;
      }

      setAuthStatus("authenticated");
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (authStatus !== "authenticated") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
        <section className="surface w-full rounded-2xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Tarology v2
          </p>
          <h1 className="mt-2 text-2xl text-[var(--color-ink)]">Checking session</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Verifying access to your reading workspace.
          </p>
        </section>
      </main>
    );
  }

  return <ReadingStudioShell />;
}
