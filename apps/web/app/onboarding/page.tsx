import { OnboardingGate } from "../../components/onboarding/onboarding-gate";
import { sanitizeReturnTo } from "../../lib/return-to";

interface OnboardingPageProps {
  searchParams?: Promise<{
    returnTo?: string | string[];
  }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const returnTo = sanitizeReturnTo(resolvedSearchParams?.returnTo);

  return <OnboardingGate returnTo={returnTo} />;
}
