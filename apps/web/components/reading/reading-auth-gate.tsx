"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileShellDto, UserPreferencesDto } from "@tarology/shared";
import {
  fetchPreferences,
  fetchProfile,
  fetchSession,
  isTransientClientApiError,
  isUnauthorizedClientApiError,
} from "../../lib/client-api";
import {
  GATE_BOOTSTRAP_TIMEOUT_MS,
  retryTransientClientLoad,
} from "../../lib/retry-transient-client-load";
import { ReadingStudioShell } from "./reading-studio-shell";

type AuthGateStatus = "checking" | "ready" | "error";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unable to load your workspace access right now. Please try again.";
}

export function ReadingAuthGate() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthGateStatus>("checking");
  const [profile, setProfile] = useState<ProfileShellDto | null>(null);
  const [preferences, setPreferences] = useState<UserPreferencesDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      setAuthStatus("checking");
      setErrorMessage(null);

      try {
        await retryTransientClientLoad(async () => {
          const session = await fetchSession({ timeoutMs: GATE_BOOTSTRAP_TIMEOUT_MS });
          if (cancelled) {
            return;
          }

          if (!session) {
            router.replace("/login?returnTo=%2Freading");
            return;
          }

          const [{ profile: loadedProfile }, { preferences: loadedPreferences }] = await Promise.all([
            fetchProfile({ timeoutMs: GATE_BOOTSTRAP_TIMEOUT_MS }),
            fetchPreferences({ timeoutMs: GATE_BOOTSTRAP_TIMEOUT_MS }),
          ]);

          if (cancelled) {
            return;
          }

          if (!loadedPreferences.defaultDeckId) {
            router.replace("/onboarding?returnTo=%2Freading");
            return;
          }

          setProfile(loadedProfile);
          setPreferences(loadedPreferences);
          setAuthStatus("ready");
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isUnauthorizedClientApiError(error)) {
          router.replace("/login?returnTo=%2Freading");
          return;
        }

        setErrorMessage(
          isTransientClientApiError(error)
            ? "Checking your session took too long. Please try again."
            : getErrorMessage(error)
        );
        setAuthStatus("error");
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [reloadToken, router]);

  if (authStatus === "checking") {
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

  if (authStatus === "error") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
        <section className="surface w-full rounded-2xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Tarology v2
          </p>
          <h1 className="mt-2 text-2xl text-[var(--color-ink)]">Unable to load workspace</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            {errorMessage ?? "Loading your session and deck preferences failed."}
          </p>
          <button
            type="button"
            className="mt-6 inline-flex items-center justify-center rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
            onClick={() => setReloadToken((current) => current + 1)}
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  if (!profile || !preferences) {
    return null;
  }

  return <ReadingStudioShell profile={profile} preferences={preferences} />;
}
