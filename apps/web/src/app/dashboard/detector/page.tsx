import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ResponsibleUseNote } from "@/components/responsible-use-note";
import { getFreelancers } from "@/lib/freelancer-queries";
import { canSeeWriterSuggestions } from "@/lib/onboarding";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { getDailyUsage } from "@/lib/usage";
import { DetectorTool } from "./detector-tool";

export const metadata: Metadata = { title: "AI Detector" };

export default async function DetectorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ contents }, profile] = await Promise.all([getDailyUsage(), getCurrentProfile()]);
  const writers = canSeeWriterSuggestions(profile?.occupation) ? await getFreelancers("writer") : null;

  return (
    <div>
      <PageHeader title="AI Text Detector" description="Check how likely a piece of text is to be AI-generated, sentence by sentence." />
      <ResponsibleUseNote tool="detector" />
      <DetectorTool usage={contents} writers={writers} />
    </div>
  );
}
