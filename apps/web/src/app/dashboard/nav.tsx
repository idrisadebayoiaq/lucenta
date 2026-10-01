"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BarChart3, BriefcaseBusiness, Bot, ChevronDown, Code2, Globe, History, Home, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, User, UserCog, Users, Wand2, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";
import { signOut } from "../(auth)/actions";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/analyzer", label: "Website Analyzer", icon: Globe },
  { href: "/dashboard/compare", label: "Compare sites", icon: BarChart3 },
  { href: "/dashboard/detector", label: "AI Detector", icon: Bot },
  { href: "/dashboard/rewriter", label: "Rewriter", icon: Wand2 },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/api", label: "Developer API", icon: Code2 },
];

const ACCOUNT_NAV = [
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/freelancer", label: "Freelancer profile", icon: BriefcaseBusiness },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export type NavUser = { name: string | null; email: string | null; avatarUrl: string | null };

const ADMIN_NAV = [
  { href: "/dashboard/admin", label: "Admin", icon: ShieldCheck, exact: false },
  { href: "/dashboard/users", label: "Users", icon: UserCog, exact: false },
];

function NavLinks({ onNavigate, isAdmin }: { onNavigate?: () => void; isAdmin?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  const renderLink = ({ href, label, icon: Icon, exact }: (typeof NAV)[number]) => {
    const active = isActive(href, exact);
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 border-2 px-3 py-2 text-[15px] transition-[transform,box-shadow,border-color]",
          active
            ? "border-ink bg-card font-extrabold text-foreground shadow-brutal-xs"
            : "border-transparent font-semibold text-foreground/85 hover:border-ink hover:bg-card",
        )}
      >
        <Icon className={cn("h-5 w-5", active && "text-primary")} strokeWidth={active ? 2.5 : 2} />
        {label}
      </Link>
    );
  };

  return (
    <nav className="flex flex-1 flex-col gap-1">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-3 border-2 border-transparent px-3 py-2 text-[15px] font-semibold text-foreground/85 hover:border-ink hover:bg-card"
      >
        <Home className="h-5 w-5" />
        Home
      </Link>
      <p className="mt-3 px-3 pb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Tools</p>
      {NAV.map(renderLink)}
      <p className="mt-3 px-3 pb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Account</p>
      {ACCOUNT_NAV.map(renderLink)}
      {isAdmin && (
        <>
          <p className="mt-3 px-3 pb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Admin</p>
          {ADMIN_NAV.map(renderLink)}
        </>
      )}
      <Link
        href="/freelancers"
        onClick={onNavigate}
        className="mt-3 flex items-center gap-3 border-2 border-transparent px-3 py-2 text-[15px] font-semibold text-foreground/85 hover:border-ink hover:bg-card"
      >
        <Users className="h-5 w-5" />
        Hire a freelancer
      </Link>
      <Link href="/dashboard/analyzer" onClick={onNavigate} className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full")}>
        Audit a website
      </Link>
    </nav>
  );
}

export function Avatar({ user, size = 32 }: { user: Pick<NavUser, "name" | "email" | "avatarUrl">; size?: number }) {
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" width={size} height={size} className="shrink-0 rounded-full border-2 border-ink object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full border-2 border-ink bg-primary font-extrabold text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(user.name, user.email)}
    </span>
  );
}

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-y-auto border-r-2 border-ink bg-background px-4 py-3 lg:flex">
      <Logo href="/dashboard" className="mb-4 px-3 py-2" />
      <NavLinks isAdmin={isAdmin} />
      <div className="brutal mt-6 p-4">
        <p className="font-black">Need an expert?</p>
        <p className="mt-1 text-sm text-muted-foreground">Hire a developer to fix your site, or a writer to polish your content.</p>
        <Link href="/freelancers" className={cn(buttonVariants({ size: "sm", variant: "contrast" }), "mt-3")}>
          Browse freelancers
        </Link>
      </div>
    </aside>
  );
}

export function Topbar({ user, isAdmin }: { user: NavUser; isAdmin?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b-2 border-ink bg-card px-4 lg:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <Logo href="/dashboard" />
        </div>
        <div className="hidden lg:block" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex cursor-pointer items-center gap-2 border-2 border-transparent p-1 pr-2 hover:border-ink"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar user={user} />
              <span className="hidden max-w-32 truncate text-sm font-bold sm:block">{user.name || user.email}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {menuOpen && (
              <div role="menu" className="brutal absolute right-0 mt-2 w-60 py-2">
                <div className="px-4 py-2">
                  <p className="truncate text-sm font-bold">{user.name || "Your account"}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="my-1 h-px bg-border" />
                <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-muted">
                  <Home className="h-4 w-4" /> Lucenta home
                </Link>
                {ACCOUNT_NAV.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </Link>
                ))}
                <div className="my-1 h-px bg-border" />
                <form action={signOut}>
                  <button type="submit" className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-500 hover:bg-muted">
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#0b0b0f]/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto border-r-2 border-ink bg-background p-4">
            <div className="mb-6 flex items-center justify-between">
              <Logo href="/dashboard" />
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} isAdmin={isAdmin} />
          </div>
        </div>
      )}
    </>
  );
}
