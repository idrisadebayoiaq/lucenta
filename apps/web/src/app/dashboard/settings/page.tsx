import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FREE_FEATURES } from "@/lib/limits";
import { getCurrentProfile } from "@/lib/supabase/server";
import { PreferencesForm, ThemeCard } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div>
      <PageHeader title="Settings" description="Preferences and privacy." />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your free limits</CardTitle>
            <CardDescription>Every Lucenta feature is free. Limits reset daily at midnight UTC.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <ThemeCard />
        <PreferencesForm saveHistory={profile.save_history} emailNotifications={profile.email_notifications} />
      </div>
    </div>
  );
}
