"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DeckSummary, UserPreferencesDto } from "@tarology/shared";
import {
  fetchDecks,
  fetchPreferences,
  fetchSession,
  isTransientClientApiError,
  isUnauthorizedClientApiError,
  patchPreferences,
} from "../../lib/client-api";
import {
  GATE_BOOTSTRAP_TIMEOUT_MS,
  retryTransientClientLoad,
} from "../../lib/retry-transient-client-load";

interface OnboardingGateProps {
  returnTo: string;
}

type OnboardingState = "loading" | "ready" | "saving" | "error";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unable to load onboarding right now. Please try again.";
}

export function OnboardingGate({ returnTo }: OnboardingGateProps) {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>("loading");
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState("thoth");
  const [preferences, setPreferences] = useState<UserPreferencesDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadOnboarding() {
      setState("loading");
      setErrorMessage(null);

      try {
        await retryTransientClientLoad(async () => {
          const session = await fetchSession({ timeoutMs: GATE_BOOTSTRAP_TIMEOUT_MS });
          if (cancelled) {
            return;
          }

          if (!session) {
            router.replace("/login?returnTo=%2Fonboarding");
            return;
          }

          const [{ preferences: loadedPreferences }, { decks: loadedDecks }] = await Promise.all([
            fetchPreferences({ timeoutMs: GATE_BOOTSTRAP_TIMEOUT_MS }),
            fetchDecks({ timeoutMs: GATE_BOOTSTRAP_TIMEOUT_MS }),
          ]);

          if (cancelled) {
            return;
          }

          if (loadedPreferences.defaultDeckId) {
            router.replace(returnTo);
            return;
          }

          if (loadedDecks.length === 0) {
            throw new Error("No tarot decks are currently available for onboarding.");
          }

          setPreferences(loadedPreferences);
          setDecks(loadedDecks);
          setSelectedDeckId(loadedPreferences.defaultDeckId ?? loadedDecks[0].id);
          setState("ready");
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isUnauthorizedClientApiError(error)) {
          router.replace("/login?returnTo=%2Fonboarding");
          return;
        }

        setErrorMessage(
          isTransientClientApiError(error)
            ? "Checking your session took too long. Please try again."
            : getErrorMessage(error)
        );
        setState("error");
      }
    }

    void loadOnboarding();

    return () => {
      cancelled = true;
    };
  }, [reloadToken, returnTo, router]);

  async function handleContinue() {
    setState("saving");
    setErrorMessage(null);

    try {
      await patchPreferences({ defaultDeckId: selectedDeckId });
      router.replace(returnTo);
    } catch (error) {
      if (isUnauthorizedClientApiError(error)) {
        router.replace("/login?returnTo=%2Fonboarding");
        return;
      }

      setErrorMessage(getErrorMessage(error));
      setState("error");
    }
  }

  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId) ?? null;
  const hasPersistedDefaultDeck = preferences?.defaultDeckId !== null;

  if (state === "loading") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10">
        <section className="surface w-full rounded-2xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Tarology v2
          </p>
          <h1 className="mt-2 text-2xl text-[var(--color-ink)]">Preparing onboarding</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Loading your deck preferences and available starter deck.
          </p>
        </section>
      </main>
    );
  }

  if (state === "error" || !selectedDeck || !preferences) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10">
        <section className="surface w-full rounded-2xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Tarology v2
          </p>
          <h1 className="mt-2 text-2xl text-[var(--color-ink)]">Unable to load onboarding</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            {errorMessage ?? "A temporary error blocked deck setup."}
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10">
      <section className="surface grid w-full gap-8 rounded-[1.75rem] border border-[var(--color-border)] p-6 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] md:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            First-run setup
          </p>
          <h1 className="mt-3 text-3xl text-[var(--color-ink)]">Choose your default tarot deck</h1>
          <p className="mt-3 max-w-2xl text-sm text-[var(--color-muted)]">
            Every new reading needs a default deck before card assignment happens. You can add
            per-reading overrides later; this step just sets your baseline.
          </p>

          <button
            type="button"
            className="mt-6 flex w-full items-start gap-4 rounded-[1.3rem] border border-[var(--color-accent)] bg-[rgba(193,168,106,0.08)] p-4 text-left"
            onClick={() => setSelectedDeckId(selectedDeck.id)}
            aria-pressed="true"
          >
            <img
              src={
                selectedDeck.previewImageUrl ??
                selectedDeck.backImageUrl ??
                "/images/cards/thoth/backofcard/BackOfCard.jpg"
              }
              alt={`${selectedDeck.name} preview`}
              className="h-32 w-[5.5rem] rounded-xl border border-[var(--color-border-strong)] object-cover shadow-[0_12px_28px_rgba(0,0,0,0.28)]"
            />
            <span className="flex flex-1 flex-col gap-3">
              <span>
                <span className="block text-base font-semibold text-[var(--color-ink)]">
                  {selectedDeck.name}
                </span>
                <span className="mt-1 block text-sm text-[var(--color-muted)]">
                  {selectedDeck.description}
                </span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-accent)]">
                {selectedDeck.cardCount} cards • Spec {selectedDeck.specVersion}
              </span>
            </span>
          </button>
        </div>

        <aside className="rounded-[1.3rem] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Account
          </p>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Onboarding is incomplete until you save a default deck.
          </p>
          <dl className="mt-6 space-y-4">
            <div>
              <dt className="text-xs uppercase tracking-[0.08em] text-[var(--color-muted)]">
                Default deck
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                {selectedDeck.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.08em] text-[var(--color-muted)]">
                Status
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                {hasPersistedDefaultDeck ? "Complete" : "Pending setup"}
              </dd>
            </div>
          </dl>

          {errorMessage ? (
            <p className="mt-5 rounded-xl border border-[rgba(222,117,117,0.4)] bg-[rgba(120,33,33,0.22)] px-3 py-2 text-sm text-[#f5c8c8]">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="button"
            className="mt-8 inline-flex w-full items-center justify-center rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleContinue()}
            disabled={state === "saving"}
          >
            {state === "saving" ? "Saving..." : "Continue with Thoth"}
          </button>
        </aside>
      </section>
    </main>
  );
}
