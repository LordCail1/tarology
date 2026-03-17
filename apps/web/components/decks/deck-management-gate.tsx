"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DeckSummary, ProfileShellDto, UserPreferencesDto } from "@tarology/shared";
import {
  fetchDecks,
  fetchPreferences,
  fetchProfile,
  fetchSession,
  isTransientClientApiError,
  isUnauthorizedClientApiError,
} from "../../lib/client-api";
import { retryTransientClientLoad } from "../../lib/retry-transient-client-load";
import { DeckManagementShell } from "./deck-management-shell";

type DeckGateStatus = "checking" | "ready" | "error";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unable to load your deck library right now. Please try again.";
}

export function DeckManagementGate() {
  const router = useRouter();
  const [status, setStatus] = useState<DeckGateStatus>("checking");
  const [profile, setProfile] = useState<ProfileShellDto | null>(null);
  const [preferences, setPreferences] = useState<UserPreferencesDto | null>(null);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDeckLibrary() {
      setStatus("checking");
      setErrorMessage(null);

      try {
        await retryTransientClientLoad(async () => {
          const session = await fetchSession();
          if (cancelled) {
            return;
          }

          if (!session) {
            router.replace("/login?returnTo=%2Fdecks");
            return;
          }

          const [{ profile: loadedProfile }, { preferences: loadedPreferences }, { decks: loadedDecks }] =
            await Promise.all([fetchProfile(), fetchPreferences(), fetchDecks()]);

          if (cancelled) {
            return;
          }

          if (!loadedPreferences.defaultDeckId) {
            router.replace("/onboarding?returnTo=%2Fdecks");
            return;
          }

          setProfile(loadedProfile);
          setPreferences(loadedPreferences);
          setDecks(loadedDecks);
          setStatus("ready");
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isUnauthorizedClientApiError(error)) {
          router.replace("/login?returnTo=%2Fdecks");
          return;
        }

        setErrorMessage(
          isTransientClientApiError(error)
            ? "Checking your session took too long. Please try again."
            : getErrorMessage(error)
        );
        setStatus("error");
      }
    }

    void loadDeckLibrary();

    return () => {
      cancelled = true;
    };
  }, [reloadToken, router]);

  if (status === "checking") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
        <section className="surface w-full rounded-2xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Tarology v2
          </p>
          <h1 className="mt-2 text-2xl text-[var(--color-ink)]">Loading deck library</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Checking your session and preparing your deck workspace.
          </p>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
        <section className="surface w-full rounded-2xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Tarology v2
          </p>
          <h1 className="mt-2 text-2xl text-[var(--color-ink)]">Unable to load deck library</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            {errorMessage ?? "A temporary error blocked deck-library access."}
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

  return (
    <DeckManagementShell profile={profile} preferences={preferences} availableDecks={decks} />
  );
}
