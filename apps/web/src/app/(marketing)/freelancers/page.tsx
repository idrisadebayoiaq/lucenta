import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { FreelancerListCard } from "@/components/freelancer-card";
import { buttonVariants } from "@/components/ui/button";
import { getFreelancers } from "@/lib/freelancer-queries";
import { SPECIALTIES, type FreelancerKind } from "@/lib/freelancers";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Hire a freelancer",
  description: "Hire developers to fix your website, or content writers for SEO articles, copy, books, scripts and more.",
};

const TABS: { id: FreelancerKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "developer", label: "Developers" },
  { id: "writer", label: "Writers" },
];

export default async function FreelancersPage({ searchParams }: PageProps<"/freelancers">) {
  const params = await searchParams;
  const type: FreelancerKind | "all" = params.type === "developer" || params.type === "writer" ? params.type : "all";
  const specialty = typeof params.specialty === "string" ? params.specialty : null;

  const all = await getFreelancers();
  const freelancers = all.filter((f) => (type === "all" || f.kind === type) && (!specialty || f.specialties.includes(specialty)));
  const specialtyOptions = type === "all" ? [] : SPECIALTIES[type].filter((s) => all.some((f) => f.kind === type && f.specialties.includes(s.id)));

  const href = (next: { type?: string; specialty?: string | null }) => {
    const q = new URLSearchParams();
    const t = next.type ?? type;
    if (t !== "all") q.set("type", t);
    if (next.specialty) q.set("specialty", next.specialty);
    const s = q.toString();
    return s ? `/freelancers?${s}` : "/freelancers";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Hire a freelancer</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Developers who can fix the issues in your website report, and content writers for SEO articles, copy, books, scripts and more.
          </p>
        </div>
        <Link href="/dashboard/freelancer" className={buttonVariants({ variant: "outline", className: "shrink-0" })}>
          <UserPlus className="h-4 w-4" /> List yourself
        </Link>
      </div>

      <nav className="mt-10 flex flex-wrap gap-2" aria-label="Freelancer type">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={href({ type: t.id, specialty: null })}
            aria-current={type === t.id ? "page" : undefined}
            className={cn(
              "border-2 border-ink px-4 py-2 text-sm font-bold transition-colors",
              type === t.id ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
            )}
          >
            {t.label}
            <span className="ml-1.5 font-medium opacity-70">{t.id === "all" ? all.length : all.filter((f) => f.kind === t.id).length}</span>
          </Link>
        ))}
      </nav>

      {specialtyOptions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {specialtyOptions.map((s) => (
            <Link
              key={s.id}
              href={href({ specialty: specialty === s.id ? null : s.id })}
              className={cn(
                "border-2 border-ink px-3 py-1 text-sm transition-colors",
                specialty === s.id ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}

      {freelancers.length ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {freelancers.map((f) => (
            <FreelancerListCard key={f.id} freelancer={f} />
          ))}
        </div>
      ) : (
        <div className="mt-8 border-2 border-dashed border-ink bg-card p-10 text-center">
          <p className="font-bold">{type === "writer" ? "No writers listed yet" : "No freelancers match this filter yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Are you a {type === "writer" ? "writer" : "developer or writer"}? Be one of the first on Lucenta.</p>
          <Link href="/dashboard/freelancer" className={buttonVariants({ size: "sm", className: "mt-4" })}>
            Set up your profile
          </Link>
        </div>
      )}
    </div>
  );
}
