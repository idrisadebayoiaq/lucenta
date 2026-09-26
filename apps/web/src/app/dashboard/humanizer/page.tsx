import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ResponsibleUseNote } from "@/components/responsible-use-note";
import { isLLMConfigured } from "@/lib/openai";
import { getCurrentUser } from "@/lib/supabase/server";
import { getDailyUsage } from "@/lib/usage";
import { HumanizerTool } from "./humanizer-tool";

export const metadata: Metadata = { title: "Humanizer" };

export default async function HumanizerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { contents } = await getDailyUsage(user.id);

  return (
    <div>
      <PageHeader title="Humanizer" description="Rewrite robotic text so it sounds natural — while keeping your meaning, names and numbers." />
      <ResponsibleUseNote tool="humanizer" />
      <HumanizerTool usage={contents} configured={isLLMConfigured()} />
    </div>
  );
}
