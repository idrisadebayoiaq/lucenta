import { AnnouncementBar } from "@/components/announcement-bar";
import { AuthStatusProvider } from "@/components/auth-state";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthStatusProvider>
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </AuthStatusProvider>
  );
}
