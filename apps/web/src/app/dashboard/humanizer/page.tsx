import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ResponsibleUseNote } from "@/components/responsible-use-note";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { canUseHumanizer } from "@/lib/onboarding";
import { isLLMConfigured } from "@/lib/openai";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { getDailyUsage } from "@/lib/usage";
import { HumanizerTool } from "./humanizer-tool";

export const metadata: Metadata = { title: "Humanizer" };

export default async function HumanizerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getCurrentProfile();

  if (!canUseHumanizer(profile?.occupation)) {
    return (
      <div>
        <PageHeader title="Humanizer" description="Rewrite robotic text so it sounds natural." />
        <Card className="max-w-2xl">
          <CardContent className="space-y-4 pt-6">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
              <GraduationCap className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold">The Humanizer isn&apos;t available on student accounts</h2>
            <p className="text-sm text-muted-foreground">
              To support academic integrity, students can&apos;t rewrite text with the Humanizer. You can still use the AI
              Detector to check your own drafts and the Website Analyzer to audit any site. If your occupation has changed, you can
              update it in Settings.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/detector" className={buttonVariants({})}>
                Open the AI Detector
              </Link>
              <Link href="/dashboard/settings" className={buttonVariants({ variant: "outline" })}>
                Settings
              </Link>
              <Link href="/responsible-use" className={buttonVariants({ variant: "ghost" })}>
                Responsible use
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { contents } = await getDailyUsage();

  return (
    <div>
      <PageHeader title="Humanizer" description="Rewrite robotic text so it sounds natural, while keeping your meaning, names and numbers." />
      <ResponsibleUseNote tool="humanizer" />
      <HumanizerTool usage={contents} configured={isLLMConfigured()} />
    </div>
  );
}
