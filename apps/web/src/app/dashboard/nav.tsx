"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, Globe, History, Home, LayoutDashboard, LogOut, Menu, Settings, User, Users, Wand2, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";
import { signOut } from "../(auth)/actions";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/analyzer", label: "Website Analyzer", icon: Globe },
  { href: "/dashboard/detector", label: "AI Detector", icon: Bot },
  { href: "/dashboard/rewriter", label: "Rewriter", icon: Wand2 },
  { href: "/dashboard/history", label: "History", icon: History },
];

const ACCOUNT_NAV = [
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export type NavUser = { name: string | null; email: string | null; avatarUrl: string | null };

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
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
          "flex w-fit items-center gap-4 rounded-full py-2.5 pl-3 pr-5 text-[17px] transition-colors hover:bg-muted",
          active ? "font-bold text-foreground" : "text-foreground/90",
        )}
      >
        <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
        {label}
      </Link>
    );
  };

  return (
    <nav className="flex flex-1 flex-col gap-1">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex w-fit items-center gap-4 rounded-full py-2.5 pl-3 pr-5 text-[17px] text-foreground/90 transition-colors hover:bg-muted"
      >
        <Home className="h-6 w-6" />
        Home
      </Link>
      {NAV.map(renderLink)}
      {ACCOUNT_NAV.map(renderLink)}
      <Link
        href="/developers"
        onClick={onNavigate}
        className="flex w-fit items-center gap-4 rounded-full py-2.5 pl-3 pr-5 text-[17px] text-foreground/90 transition-colors hover:bg-muted"
      >
        <Users className="h-6 w-6" />
        Developers
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
    return <img src={user.avatarUrl} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(user.name, user.email)}
    </span>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r px-4 py-3 lg:flex">
      <Logo href="/dashboard" className="mb-6 px-3 py-2" />
      <NavLinks />
      <div className="rounded-2xl border p-4">
        <p className="font-bold">Need help fixing your site?</p>
        <p className="mt-1 text-sm text-muted-foreground">Hand your report to a developer who can fix the issues for you.</p>
        <Link href="/developers" className={cn(buttonVariants({ size: "sm", variant: "contrast" }), "mt-3")}>
          Hire a developer
        </Link>
      </div>
    </aside>
  );
}

export function Topbar({ user }: { user: NavUser }) {
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
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-md lg:px-8">
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
              className="flex cursor-pointer items-center gap-2 rounded-full p-1 pr-2 hover:bg-muted"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar user={user} />
              <span className="hidden max-w-32 truncate text-sm font-bold sm:block">{user.name || user.email}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-60 rounded-2xl border bg-background py-2 shadow-[0_0_15px_rgba(255,255,255,0.15)]">
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
          <div className="absolute inset-0 bg-[#5b7083]/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto bg-background p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <Logo href="/dashboard" />
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
