import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Briefcase, Facebook, Globe, Instagram, Mail, MapPin, Phone, Wrench } from "lucide-react";
import { XLogo, WhatsAppIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { contactLinks, displayPhone, type Developer } from "@/lib/developers";
import { cn, initials } from "@/lib/utils";

export function DeveloperAvatar({ dev, size = 64 }: { dev: Developer; size?: number }) {
  if (dev.avatar_url) {
    return (
      <Image
        src={dev.avatar_url}
        alt={dev.name}
        width={size}
        height={size}
        unoptimized={!dev.avatar_url.startsWith("/")}
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
      {initials(dev.name, null)}
    </span>
  );
}

function NameLine({ dev }: { dev: Developer }) {
  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-1.5 text-lg font-bold">
        {dev.name}
        <BadgeCheck className="h-5 w-5 fill-primary text-primary-foreground" aria-label="Verified developer" />
      </p>
      <p className="text-sm text-muted-foreground">{dev.headline}</p>
    </div>
  );
}

function ContactButtons({ dev, siteUrl, compact }: { dev: Developer; siteUrl?: string; compact?: boolean }) {
  const links = contactLinks(dev, { siteUrl });
  return (
    <div className="flex flex-wrap gap-2">
      {links.whatsapp && (
        <a href={links.whatsapp} target="_blank" rel="noreferrer" className={buttonVariants({ size: compact ? "sm" : "md" })}>
          <WhatsAppIcon className="h-4 w-4" /> WhatsApp
        </a>
      )}
      {links.phone && (
        <a href={links.phone} className={buttonVariants({ variant: "outline", size: compact ? "sm" : "md" })}>
          <Phone className="h-4 w-4" /> Call {displayPhone(dev.phone!)}
        </a>
      )}
      {links.email && (
        <a href={links.email} className={buttonVariants({ variant: "outline", size: compact ? "sm" : "md" })}>
          <Mail className="h-4 w-4" /> Email
        </a>
      )}
    </div>
  );
}

function SocialLinks({ dev }: { dev: Developer }) {
  const links = contactLinks(dev);
  const items = [
    { href: links.portfolio, label: "Portfolio", icon: Globe },
    { href: links.x, label: "X", icon: XLogo },
    { href: links.facebook, label: "Facebook", icon: Facebook },
    { href: links.instagram, label: "Instagram", icon: Instagram },
  ].filter((i) => i.href);
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
          {links.portfolio.replace(/^https?:\/\//, "")}
        </a>
      )}
    </div>
  );
}

export function DeveloperCard({ dev }: { dev: Developer }) {
  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-start gap-4">
          <DeveloperAvatar dev={dev} size={72} />
          <NameLine dev={dev} />
        </div>
        <p className="text-[15px] leading-relaxed">{dev.bio}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {dev.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {dev.location}
            </span>
          )}
          {dev.experience && (
            <span className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" /> {dev.experience}
            </span>
          )}
          {dev.is_available && <span className="font-medium text-emerald-500">● Available for projects</span>}
        </div>
        {dev.services.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {dev.services.map((s) => (
              <div key={s.title} className="rounded-2xl border p-4">
                <p className="font-semibold">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        )}
        {dev.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dev.skills.map((s) => (
              <Badge key={s} tone="outline">
                {s}
              </Badge>
            ))}
          </div>
        )}
        <ContactButtons dev={dev} />
        <SocialLinks dev={dev} />
      </CardContent>
    </Card>
  );
}

/** Shown under a website report: offers a developer who can fix the issues found. */
export function HireDeveloperCard({ developers, siteUrl, issueCount }: { developers: Developer[]; siteUrl: string; issueCount: number }) {
  if (developers.length === 0) return null;
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
              Reach out to an available developer. They&apos;ll get your report context, so you can skip the back and forth.
            </p>
          </div>
        </div>
        <div className="divide-y rounded-2xl border">
          {developers.map((dev) => (
            <div key={dev.id} className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <DeveloperAvatar dev={dev} size={48} />
                <NameLine dev={dev} />
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground">{dev.bio}</p>
              <ContactButtons dev={dev} siteUrl={siteUrl} compact />
            </div>
          ))}
        </div>
        <Link href="/developers" className={cn("text-sm font-medium text-primary hover:underline")}>
          See full developer profiles →
        </Link>
      </CardContent>
    </Card>
  );
}
