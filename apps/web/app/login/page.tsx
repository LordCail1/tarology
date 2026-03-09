import { getClientApiBaseUrl } from "../../lib/api-origin";

interface LoginPageProps {
  searchParams?: Promise<{
    returnTo?: string | string[];
  }>;
}

function sanitizeReturnTo(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/reading";
  }

  return candidate;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const returnTo = sanitizeReturnTo(resolvedSearchParams?.returnTo);
  const authStartUrl = new URL("/v1/auth/google/start", getClientApiBaseUrl());
  authStartUrl.searchParams.set("returnTo", returnTo);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
      <section className="surface w-full rounded-2xl p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
          Tarology v2
        </p>
        <h1 className="mt-2 text-2xl text-[var(--color-ink)]">Sign in to continue</h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Google sign-in is required to access your reading workspace.
        </p>

        <a
          href={authStartUrl.toString()}
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Continue with Google
        </a>
      </section>
    </main>
  );
}
