import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Facebook, Globe, Instagram, Linkedin, Mail, MapPin, Phone, Wrench } from "lucide-react";
import { XLogo, WhatsAppIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import type { FreelancerMatch } from "@/lib/freelancer-match";
import { contactLinks, displayPhone, kindLabel, specialtyLabel, type ContactContext, type Freelancer } from "@/lib/freelancers";
import { cn, initials } from "@/lib/utils";

export function FreelancerAvatar({ freelancer, size = 64 }: { freelancer: Pick<Freelancer, "name" | "avatar_url">; size?: number }) {
  if (freelancer.avatar_url) {
    return (
      <Image
        src={freelancer.avatar_url}
        alt={freelancer.name}
        width={size}
        height={size}
        unoptimized={!freelancer.avatar_url.startsWith("/")}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(freelancer.name, null)}
    </span>
  );
}

export function VerifiedBadge({ freelancer, className }: { freelancer: Freelancer; className?: string }) {
  if (!freelancer.is_verified) return null;
  return <BadgeCheck className={cn("h-5 w-5 shrink-0 fill-primary text-primary-foreground", className)} aria-label="Verified by Lucenta" />;
}

export function FreelancerName({ freelancer, link }: { freelancer: Freelancer; link?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-1.5 text-lg font-bold">
        {link ? (
          <Link href={`/freelancers/${freelancer.slug}`} className="hover:underline">
            {freelancer.name}
          </Link>
        ) : (
          freelancer.name
        )}
        <VerifiedBadge freelancer={freelancer} />
      </p>
      <p className="text-sm text-muted-foreground">{freelancer.headline}</p>
    </div>
  );
}

export function ContactButtons({ freelancer, context, compact }: { freelancer: Freelancer; context?: ContactContext; compact?: boolean }) {
  const links = contactLinks(freelancer, context);
  const size = compact ? "sm" : "md";
  return (
    <div className="flex flex-wrap gap-2">
      {links.whatsapp && (
        <a href={links.whatsapp} target="_blank" rel="noreferrer" className={buttonVariants({ size })}>
          <WhatsAppIcon className="h-4 w-4" /> WhatsApp
        </a>
      )}
      {links.phone && (
        <a href={links.phone} className={buttonVariants({ variant: "outline", size })}>
          <Phone className="h-4 w-4" /> Call {displayPhone(freelancer.phone!)}
        </a>
      )}
      {links.email && (
        <a href={links.email} className={buttonVariants({ variant: "outline", size })}>
          <Mail className="h-4 w-4" /> Email
        </a>
      )}
    </div>
  );
}

export function SocialLinks({ freelancer }: { freelancer: Freelancer }) {
  const links = contactLinks(freelancer);
  const items = [
    { href: links.portfolio, label: "Portfolio", icon: Globe },
    { href: links.linkedin, label: "LinkedIn", icon: Linkedin },
    { href: links.x, label: "X", icon: XLogo },
    { href: links.facebook, label: "Facebook", icon: Facebook },
    { href: links.instagram, label: "Instagram", icon: Instagram },
  ].filter((i) => i.href);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map(({ href, label, icon: Icon }) => (
        <a
          key={label}
          href={href!}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
      {links.portfolio && (
        <a href={links.portfolio} target="_blank" rel="noreferrer" className="ml-1 text-sm text-primary hover:underline">
          {links.portfolio.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </a>
      )}
    </div>
  );
}

export function SpecialtyChips({ ids, max }: { ids: string[]; max?: number }) {
  const shown = max ? ids.slice(0, max) : ids;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((s) => (
        <Badge key={s}>{specialtyLabel(s)}</Badge>
      ))}
      {max && ids.length > max && <Badge tone="outline">+{ids.length - max} more</Badge>}
    </div>
  );
}

/** Directory card linking to the full profile. */
export function FreelancerListCard({ freelancer }: { freelancer: Freelancer }) {
  return (
    <Card className="group flex flex-col transition-colors hover:bg-muted/40">
      <CardContent className="flex flex-1 flex-col gap-4 pt-6">
        <div className="flex items-start gap-4">
          <FreelancerAvatar freelancer={freelancer} size={60} />
          <div className="min-w-0 flex-1">
            <FreelancerName freelancer={freelancer} link />
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <Badge tone="outline">{kindLabel(freelancer.kind)}</Badge>
              {freelancer.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {freelancer.location}
                </span>
              )}
              {freelancer.is_available && <span className="font-medium text-emerald-500">● Available</span>}
            </div>
          </div>
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">{freelancer.bio}</p>
        {freelancer.specialties.length > 0 && <SpecialtyChips ids={freelancer.specialties} max={3} />}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          {freelancer.starting_rate ? <span className="text-sm font-semibold">From {freelancer.starting_rate}</span> : <span />}
          <Link href={`/freelancers/${freelancer.slug}`} className={buttonVariants({ size: "sm", variant: "contrast" })}>
            View profile
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/** Shown under a website report: the developers whose specialties best cover the issues found. */
export function HireDeveloperCard({ matches, siteUrl, issueCount }: { matches: FreelancerMatch[]; siteUrl: string; issueCount: number }) {
  return (
    <Card className="border-primary/40">
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Wrench className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-bold">Want an expert to fix {issueCount > 0 ? `these ${issueCount} issues` : "and improve your site"}?</p>
            <p className="text-sm text-muted-foreground">
              {matches.length
                ? "These developers match the problems in this report. They'll get your report context, so you can skip the back and forth."
                : "No developers are listed yet. Check back soon."}
            </p>
          </div>
        </div>
        {matches.length > 0 && (
          <div className="divide-y-2 divide-ink border-2 border-ink bg-card">
            {matches.map(({ freelancer, reasons }) => (
              <div key={freelancer.id} className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <FreelancerAvatar freelancer={freelancer} size={48} />
                  <FreelancerName freelancer={freelancer} link />
                </div>
                {reasons.length > 0 && (
                  <p className="text-sm">
                    <span className="font-semibold">Good fit for: </span>
                    <span className="text-muted-foreground">{reasons.join(", ")}</span>
                  </p>
                )}
                <p className="line-clamp-2 text-sm text-muted-foreground">{freelancer.bio}</p>
                <ContactButtons freelancer={freelancer} context={{ siteUrl }} compact />
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link href="/freelancers?type=developer" className="font-medium text-primary hover:underline">
            See all developers →
          </Link>
          <Link href="/dashboard/freelancer" className="text-muted-foreground hover:text-foreground hover:underline">
            Are you a developer? Get listed
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
