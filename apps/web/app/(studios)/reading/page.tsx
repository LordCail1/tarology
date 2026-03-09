import { redirect } from "next/navigation";
import { ReadingStudioShell } from "../../../components/reading/reading-studio-shell";
import { getSession } from "../../../lib/get-session";

export const dynamic = "force-dynamic";

export default async function ReadingStudioPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?returnTo=%2Freading");
  }

  return <ReadingStudioShell />;
}
