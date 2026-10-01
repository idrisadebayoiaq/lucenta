import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Briefcase, Building2, CalendarDays, Globe, MapPin } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, Badge } from "@/components/ui/misc";
import { signAvatar } from "@/lib/avatars";
import { createClient, getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { AvatarCard, DangerZone, EmailForm, PasswordForm, ProfileForm } from "./profile-forms";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: PageProps<"/dashboard/profile">) {
  const { emailChanged } = await searchParams;
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!user || !profile) redirect("/login");

  const isEmailUser = user.app_metadata.provider === "email";
  const details = [
    { icon: Briefcase, value: profile.job_title },
    { icon: Building2, value: profile.company },
    { icon: MapPin, value: profile.location },
    { icon: Globe, value: profile.website, href: profile.website },
    { icon: CalendarDays, value: `Joined ${formatDate(profile.created_at)}` },
  ].filter((d) => d.value);

  return (
    <div>
      <PageHeader title="Profile" description="Manage your personal information and account security." />
      {emailChanged === "done" && (
        <div className="mb-6">
          <Alert tone="success" title="Email updated">
            Your email address is now {profile.email ?? user.email}.
          </Alert>
        </div>
      )}
      {emailChanged === "pending" && (
        <div className="mb-6">
          <Alert title="One more step">Open the link sent to your other email address to finish changing your email.</Alert>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-6">
          <AvatarCard profile={profile} avatarSrc={await signAvatar(await createClient(), profile.avatar_url)} />
          <Card>
            <CardContent className="space-y-3 pt-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account</span>
                <Badge>Free</Badge>
              </div>
              {profile.bio && <p className="text-muted-foreground">{profile.bio}</p>}
              <ul className="space-y-2">
                {details.map(({ icon: Icon, value, href }) => (
                  <li key={value} className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4 shrink-0" />
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
                        {value!.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="truncate">{value}</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <ProfileForm profile={profile} />
          <EmailForm email={profile.email ?? user.email ?? ""} />
          {isEmailUser && <PasswordForm />}
          <DangerZone />
        </div>
      </div>
    </div>
  );
}
