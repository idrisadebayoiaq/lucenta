import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const params = await searchParams;
  const nextParam = typeof params.next === "string" ? params.next : "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const profile = await getCurrentProfile();
  if (profile?.birth_date && profile.occupation && profile.referral_source) redirect(next);

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{firstName ? `Welcome, ${firstName}!` : "Welcome to Lucenta!"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">A few quick questions so we can set up the right tools for you.</p>
      <div className="mt-6">
        <OnboardingForm
          next={next}
          needsBirthDate={!profile?.birth_date}
          defaults={{
            occupation: profile?.occupation ?? "",
            referralSource: profile?.referral_source ?? "",
            referralOther: profile?.referral_other ?? "",
          }}
        />
      </div>
    </div>
  );
}
