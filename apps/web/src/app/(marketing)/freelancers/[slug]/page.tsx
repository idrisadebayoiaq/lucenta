import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, Languages, MapPin, Wallet } from "lucide-react";
import { ContactButtons, FreelancerAvatar, SocialLinks, SpecialtyChips, VerifiedBadge } from "@/components/freelancer-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { getFreelancerBySlug } from "@/lib/freelancer-queries";
import { kindLabel } from "@/lib/freelancers";

export async function generateMetadata({ params }: PageProps<"/freelancers/[slug]">): Promise<Metadata> {
  const f = await getFreelancerBySlug((await params).slug);
  if (!f) return { title: "Freelancer not found" };
  return {
    title: `${f.name} · ${f.headline}`,
    description: f.bio.slice(0, 160),
    openGraph: f.avatar_url ? { images: [f.avatar_url] } : undefined,
  };
}

export default async function FreelancerProfile({ params }: PageProps<"/freelancers/[slug]">) {
  const f = await getFreelancerBySlug((await params).slug);
  if (!f) notFound();

  const facts = [
    { icon: MapPin, value: f.location },
    { icon: Briefcase, value: f.experience && `${f.experience} experience` },
    { icon: Languages, value: f.languages.length ? f.languages.join(", ") : null },
    { icon: Wallet, value: f.starting_rate && `From ${f.starting_rate}` },
  ].filter((x) => x.value);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Link href={`/freelancers?type=${f.kind}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All {kindLabel(f.kind, true).toLowerCase()}
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <FreelancerAvatar freelancer={f} size={112} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{f.name}</h1>
                    <VerifiedBadge freelancer={f} className="h-6 w-6" />
                  </div>
                  <p className="mt-1 text-lg text-muted-foreground">{f.headline}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="outline">{kindLabel(f.kind)}</Badge>
                    {f.is_available && <span className="text-sm font-medium text-emerald-500">● Available for new work</span>}
                  </div>
                </div>
              </div>
              <p className="whitespace-pre-line text-[15px] leading-relaxed">{f.bio}</p>
            </CardContent>
          </Card>

          {f.gallery.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Portfolio</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {f.gallery.map((g, i) => (
                  <figure key={g.url} className="space-y-2">
                    <a href={g.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.url} alt={g.caption || `${f.name} portfolio image ${i + 1}`} loading="lazy" className="aspect-video w-full object-cover transition-transform hover:scale-[1.02]" />
                    </a>
                    {g.caption && <figcaption className="text-sm text-muted-foreground">{g.caption}</figcaption>}
                  </figure>
                ))}
              </CardContent>
            </Card>
          )}

          {f.services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Services</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {f.services.map((s) => (
                  <div key={s.title} className="rounded-2xl border p-4">
                    <p className="font-semibold">{s.title}</p>
                    {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="lg:sticky lg:top-24">
            <CardContent className="space-y-5 pt-6">
              <div>
                <p className="font-bold">Work with {f.name.split(" ")[0]}</p>
                <p className="text-sm text-muted-foreground">Reach out directly. Lucenta doesn&apos;t take a cut.</p>
              </div>
              <ContactButtons freelancer={f} />
              <SocialLinks freelancer={f} />
              {facts.length > 0 && (
                <ul className="space-y-2 border-t pt-4 text-sm text-muted-foreground">
                  {facts.map(({ icon: Icon, value }) => (
                    <li key={value} className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" /> {value}
                    </li>
                  ))}
                </ul>
              )}
              {f.specialties.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-semibold">Specialties</p>
                  <SpecialtyChips ids={f.specialties} />
                </div>
              )}
              {f.skills.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-semibold">Skills and tools</p>
                  <div className="flex flex-wrap gap-1.5">
                    {f.skills.map((s) => (
                      <Badge key={s} tone="outline">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <p className="border-t pt-4 text-xs text-muted-foreground">
                {f.is_verified ? "Verified by Lucenta. " : ""}Agree on scope, price and payment directly with the freelancer before work starts.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
