import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { CompleteProfileForm } from "./complete-profile-form";

export const metadata: Metadata = { title: "Complete your profile" };

export default async function CompleteProfilePage({ searchParams }: PageProps<"/complete-profile">) {
  const params = await searchParams;
  const nextParam = typeof params.next === "string" ? params.next : "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const profile = await getCurrentProfile();
  if (profile?.birth_date) redirect(next);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">One more step</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Lucenta is for people aged 16 and over. Please confirm your date of birth to continue.
      </p>
      <div className="mt-6">
        <CompleteProfileForm next={next} />
      </div>
    </div>
  );
}
