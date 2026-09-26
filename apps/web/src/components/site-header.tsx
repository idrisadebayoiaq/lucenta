import Link from "next/link";
import { HeaderAuth } from "@/components/auth-state";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export const MARKETING_NAV = [
  { href: "/tools", label: "Tools" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/developers", label: "Developers" },
  { href: "/about", label: "About" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-1">
          <MobileNav items={MARKETING_NAV} />
          <Logo />
        </div>
        <nav className="hidden items-center gap-1 text-[15px] font-medium md:flex">
          {MARKETING_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full px-3 py-2 transition-colors hover:bg-muted">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
