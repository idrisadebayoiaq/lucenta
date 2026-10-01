import Link from "next/link";
import { HeaderAuth } from "@/components/auth-state";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export const MARKETING_NAV = [
  { href: "/tools", label: "Tools" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/freelancers", label: "Freelancers" },
  { href: "/about", label: "About" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-t-[6px] border-b-2 border-t-primary border-b-ink bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-1">
          <MobileNav items={MARKETING_NAV} />
          <Logo />
        </div>
        <nav className="hidden items-center gap-1 text-[15px] font-bold md:flex">
          {MARKETING_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border-b-[3px] border-transparent px-3 py-1.5 transition-colors hover:border-primary hover:text-primary"
            >
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
