import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Eye, EyeOff, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { avatarPath } from "@/lib/avatars";
import { getMyFreelancerProfile } from "@/lib/freelancer-queries";
import { FREELANCER_MIN_AGE, isAdult, kindLabel } from "@/lib/freelancers";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { FreelancerForm } from "./freelancer-form";

export const metadata: Metadata = { title: "Freelancer profile" };

export default async function FreelancerProfilePage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!user || !profile) redirect("/login");

  if (!isAdult(profile.birth_date)) {
    return (
      <div>
        <PageHeader title="Freelancer profile" />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-muted">
              <Lock className="h-5 w-5" />
            </span>
            <p className="text-lg font-bold">Freelancer profiles are for people aged {FREELANCER_MIN_AGE} and over</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Because freelancers offer paid work and share contact details publicly, you need to be at least {FREELANCER_MIN_AGE} to create a
              profile. You can still use all of Lucenta&apos;s tools.
            </p>
            <Link href="/freelancers" className="text-sm font-bold text-primary hover:underline">
              Browse freelancers →
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const listing = await getMyFreelancerProfile(user.id);

  return (
    <div>
      <PageHeader
        title="Freelancer profile"
        description={
          listing
            ? "Keep your profile up to date so the right clients find you."
            : "Developers and content writers can get hired on Lucenta. Set up your profile and get suggested to people who need your skills."
        }
      />
      {listing && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-3 pt-5 text-sm">
            <Badge tone="outline">{kindLabel(listing.kind)}</Badge>
            {listing.is_published ? (
              <span className="flex items-center gap-1.5 font-medium text-emerald-500">
                <Eye className="h-4 w-4" /> Live on Lucenta
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <EyeOff className="h-4 w-4" /> Hidden
              </span>
            )}
            {listing.is_verified && (
              <span className="flex items-center gap-1.5 font-medium">
                <BadgeCheck className="h-4 w-4 fill-primary text-primary-foreground" /> Verified
              </span>
            )}
            {listing.is_published && (
              <Link href={`/freelancers/${listing.slug}`} className="ml-auto font-bold text-primary hover:underline">
                lucenta/freelancers/{listing.slug}
              </Link>
            )}
          </CardContent>
        </Card>
      )}
      <FreelancerForm
        userId={user.id}
        initial={listing}
        defaults={{
          name: profile.full_name ?? "",
          email: profile.email ?? user.email ?? "",
          location: profile.location ?? "",
          avatarUrl: avatarPath(profile.avatar_url) ? null : profile.avatar_url,
        }}
      />
    </div>
  );
}
