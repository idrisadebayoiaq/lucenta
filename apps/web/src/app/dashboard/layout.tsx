import { redirect } from "next/navigation";
import { AnnouncementBar } from "@/components/announcement-bar";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { Sidebar, Topbar, type NavUser } from "./nav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getCurrentProfile();
  if (profile && (!profile.birth_date || !profile.occupation || !profile.referral_source)) redirect("/onboarding");

  const navUser: NavUser = {
    name: profile?.full_name ?? null,
    email: profile?.email ?? user.email ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AnnouncementBar />
        <Topbar user={navUser} />
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
