import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ResponsibleUseNote } from "@/components/responsible-use-note";
import { canUseRewrite } from "@/lib/onboarding";
import { isLLMConfigured } from "@/lib/openai";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { getDailyUsage } from "@/lib/usage";
import { RewriterWorkspace } from "./rewriter-workspace";

export const metadata: Metadata = { title: "Rewriter" };

export default async function RewriterPage({ searchParams }: PageProps<"/dashboard/rewriter">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ mode }, profile, { contents }] = await Promise.all([searchParams, getCurrentProfile(), getDailyUsage()]);
  const canRewrite = canUseRewrite(profile?.occupation);

  return (
    <div>
      <PageHeader title="Rewriter" description="Make your writing clearer, warmer and easier to read." />
      <ResponsibleUseNote tool="rewriter" />
      <RewriterWorkspace
        initialMode={canRewrite && mode !== "suggest" ? "rewrite" : "suggest"}
        canRewrite={canRewrite}
        usage={contents}
        configured={isLLMConfigured()}
      />
    </div>
  );
}
