"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Camera, Code2, ExternalLink, ImagePlus, PenLine, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { FreelancerAvatar } from "@/components/freelancer-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import {
  MAX_GALLERY,
  MAX_IMAGE_BYTES,
  MAX_SERVICES,
  MAX_SPECIALTIES,
  SPECIALTIES,
  type Freelancer,
  type FreelancerKind,
  type FreelancerService,
  type GalleryItem,
} from "@/lib/freelancers";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { deleteFreelancerProfile, saveFreelancerProfile, type FreelancerInput } from "./actions";

type Defaults = { name: string; email: string; location: string; avatarUrl: string | null };

const KIND_OPTIONS: { id: FreelancerKind; title: string; body: string; icon: typeof Code2 }[] = [
  { id: "developer", title: "Developer", body: "Build and fix websites and apps: speed, SEO, security, design and more.", icon: Code2 },
  { id: "writer", title: "Content writer", body: "SEO articles, copy, books, scripts, ghostwriting, editing and more.", icon: PenLine },
];

const splitList = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Downscales large photos and converts them to WebP before upload. */
async function prepareImage(file: File, maxSide: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  return blob ?? file;
}

async function uploadImage(userId: string, file: File, prefix: string, maxSide: number) {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error("Use a PNG, JPG or WebP image.");
  if (file.size > MAX_IMAGE_BYTES * 2) throw new Error("Images must be 10 MB or smaller.");
  const blob = await prepareImage(file, maxSide);
  if (blob.size > MAX_IMAGE_BYTES) throw new Error("That image is too large even after resizing. Try a smaller one.");
  const supabase = createClient();
  const path = `${userId}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await supabase.storage.from("freelancers").upload(path, blob, { contentType: "image/webp" });
  if (error) throw new Error(error.message);
  return supabase.storage.from("freelancers").getPublicUrl(path).data.publicUrl;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, htmlFor, hint, error, className, children }: { label: string; htmlFor?: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function FreelancerForm({ userId, initial, defaults }: { userId: string; initial: Freelancer | null; defaults: Defaults }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<"avatar" | "gallery" | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<FreelancerKind | null>(initial?.kind ?? null);
  const [name, setName] = useState(initial?.name ?? defaults.name);
  const [headline, setHeadline] = useState(initial?.headline ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [location, setLocation] = useState(initial?.location ?? defaults.location);
  const [experience, setExperience] = useState(initial?.experience ?? "");
  const [startingRate, setStartingRate] = useState(initial?.starting_rate ?? "");
  const [languages, setLanguages] = useState(initial?.languages.join(", ") ?? "English");
  const [specialties, setSpecialties] = useState<string[]>(initial?.specialties ?? []);
  const [skills, setSkills] = useState(initial?.skills.join(", ") ?? "");
  const [services, setServices] = useState<FreelancerService[]>(initial?.services ?? []);
  const [email, setEmail] = useState(initial?.email ?? defaults.email);
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(initial?.portfolio_url ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedin_url ?? "");
  const [xHandle, setXHandle] = useState(initial?.x_handle ?? "");
  const [facebookHandle, setFacebookHandle] = useState(initial?.facebook_handle ?? "");
  const [instagramHandle, setInstagramHandle] = useState(initial?.instagram_handle ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial ? initial.avatar_url : defaults.avatarUrl);
  const [gallery, setGallery] = useState<GalleryItem[]>(initial?.gallery ?? []);
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);
  const [isAvailable, setIsAvailable] = useState(initial?.is_available ?? true);

  function chooseKind(next: FreelancerKind) {
    if (next === kind) return;
    const allowed = new Set<string>(SPECIALTIES[next].map((s) => s.id));
    setSpecialties((prev) => prev.filter((s) => allowed.has(s)));
    setKind(next);
  }

  function toggleSpecialty(id: string) {
    setSpecialties((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= MAX_SPECIALTIES) {
        toast.error(`Pick up to ${MAX_SPECIALTIES} specialties.`);
        return prev;
      }
      return [...prev, id];
    });
  }

  async function onAvatar(file: File) {
    setUploading("avatar");
    try {
      setAvatarUrl(await uploadImage(userId, file, "avatar", 512));
    } catch (e) {
      toast.error((e as Error).message);
    }
    setUploading(null);
  }

  async function onGallery(files: File[]) {
    const room = MAX_GALLERY - gallery.length;
    if (room <= 0) return toast.error(`You can add up to ${MAX_GALLERY} images.`);
    if (files.length > room) toast.info(`Only the first ${room} image${room === 1 ? "" : "s"} will be added.`);
    setUploading("gallery");
    for (const file of files.slice(0, room)) {
      try {
        const url = await uploadImage(userId, file, "gallery", 1600);
        setGallery((prev) => [...prev, { url, caption: "" }]);
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
    setUploading(null);
  }

  function onSave() {
    if (!kind) {
      setErrors({ kind: "Choose developer or writer" });
      return toast.error("Choose whether you're a developer or a writer.");
    }
    const input: FreelancerInput = {
      kind,
      name,
      headline,
      bio,
      location,
      experience,
      startingRate,
      languages: splitList(languages),
      specialties,
      skills: splitList(skills),
      services: services.filter((s) => s.title.trim() || s.description.trim()),
      email,
      whatsapp,
      phone,
      portfolioUrl,
      linkedinUrl,
      xHandle,
      facebookHandle,
      instagramHandle,
      avatarUrl,
      gallery,
      isPublished,
      isAvailable,
    };
    startTransition(async () => {
      const res = await saveFreelancerProfile(input);
      setErrors(res.fieldErrors ?? {});
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(initial ? "Profile saved." : "Your freelancer profile is live!");
      router.refresh();
    });
  }

  function onDelete() {
    if (!window.confirm("Delete your freelancer profile? It will be removed from Lucenta straight away.")) return;
    startDelete(async () => {
      const res = await deleteFreelancerProfile();
      if (res.error) return void toast.error(res.error);
      toast.success("Freelancer profile deleted.");
      router.refresh();
    });
  }

  const listErrors = Object.entries(errors).filter(([k]) => /^(services|gallery)\./.test(k));

  return (
    <div className="space-y-6">
      <Section title="What do you do?" description="Choose the kind of work you offer. You can switch later.">
        <div className="grid gap-3 sm:grid-cols-2">
          {KIND_OPTIONS.map(({ id, title, body, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => chooseKind(id)}
              aria-pressed={kind === id}
              className={cn(
                "flex cursor-pointer items-start gap-3 brutal p-4 text-left transition-colors hover:bg-muted/50",
                kind === id && "border-primary bg-primary/5 ring-1 ring-primary",
              )}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-bold">{title}</span>
                <span className="block text-sm text-muted-foreground">{body}</span>
              </span>
            </button>
          ))}
        </div>
        <FieldError message={errors.kind} />
      </Section>

      <Section title="Photo and basics" description="This is what people see first in the directory.">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <FreelancerAvatar freelancer={{ name: name || "?", avatar_url: avatarUrl }} size={88} />
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              className="absolute bottom-0 right-0 grid h-8 w-8 cursor-pointer place-items-center rounded-full border-2 border-ink bg-card hover:bg-muted"
              aria-label="Upload photo"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => avatarInput.current?.click()} loading={uploading === "avatar"}>
                Upload photo
              </Button>
              {avatarUrl && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setAvatarUrl(null)}>
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">A clear photo of your face works best. PNG, JPG or WebP.</p>
            <FieldError message={errors.avatarUrl} />
          </div>
          <input
            ref={avatarInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAvatar(file);
              e.target.value = "";
            }}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name" htmlFor="name" error={errors.name}>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Headline" htmlFor="headline" error={errors.headline} hint={kind === "writer" ? "e.g. SEO writer & editor" : "e.g. Full stack developer"}>
            <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={80} aria-invalid={!!errors.headline} />
          </Field>
          <Field label="Location" htmlFor="location" error={errors.location}>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lagos, Nigeria" maxLength={80} />
          </Field>
          <Field label="Experience" htmlFor="experience" error={errors.experience}>
            <Input id="experience" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="5+ years" maxLength={60} />
          </Field>
          <Field label="Starting rate (optional)" htmlFor="rate" error={errors.startingRate} hint="e.g. ₦50,000 per project or $25/hour">
            <Input id="rate" value={startingRate} onChange={(e) => setStartingRate(e.target.value)} maxLength={60} />
          </Field>
          <Field label="Languages" htmlFor="languages" error={errors.languages} hint="Separate with commas">
            <Input id="languages" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English, Yoruba" />
          </Field>
        </div>
      </Section>

      <Section title="About you" description="Tell clients what you do, who you've worked with and what makes your work stand out.">
        <Field label="Bio" htmlFor="bio" error={errors.bio}>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1500} className="min-h-40" aria-invalid={!!errors.bio} />
          <p className="text-right text-xs text-muted-foreground">{bio.length} / 1,500</p>
        </Field>
      </Section>

      <Section
        title="Specialties and skills"
        description={`Specialties decide which ${kind === "writer" ? "writing results" : "website reports"} suggest you, so pick what you're best at (up to ${MAX_SPECIALTIES}).`}
      >
        {kind ? (
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES[kind].map((s) => {
              const on = specialties.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSpecialty(s.id)}
                  aria-pressed={on}
                  className={cn(
                    "cursor-pointer border-2 border-ink px-3 py-1.5 text-sm font-medium transition-colors",
                    on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Choose developer or writer above to see specialties.</p>
        )}
        <FieldError message={errors.specialties} />
        <Field label="Skills and tools" htmlFor="skills" error={errors.skills} hint="Separate with commas, up to 15">
          <Input
            id="skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder={kind === "writer" ? "Surfer SEO, AP style, Final Draft, Grammarly" : "Next.js, React, WordPress, Figma"}
          />
        </Field>
      </Section>

      <Section title="Services" description={`What can people hire you for? Add up to ${MAX_SERVICES}.`}>
        {services.map((s, i) => (
          <div key={i} className="space-y-2 brutal p-4">
            <div className="flex items-center gap-2">
              <Input
                value={s.title}
                onChange={(e) => setServices((prev) => prev.map((p, j) => (j === i ? { ...p, title: e.target.value } : p)))}
                placeholder={kind === "writer" ? "SEO blog posts" : "Website speed fix"}
                maxLength={60}
                aria-label="Service name"
                aria-invalid={!!errors[`services.${i}.title`]}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => setServices((prev) => prev.filter((_, j) => j !== i))} aria-label="Remove service">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={s.description}
              onChange={(e) => setServices((prev) => prev.map((p, j) => (j === i ? { ...p, description: e.target.value } : p)))}
              placeholder="What's included, turnaround time, etc."
              maxLength={300}
              className="min-h-20"
              aria-label="Service description"
            />
            <FieldError message={errors[`services.${i}.title`] ?? errors[`services.${i}.description`]} />
          </div>
        ))}
        {services.length < MAX_SERVICES && (
          <Button type="button" variant="outline" size="sm" onClick={() => setServices((prev) => [...prev, { title: "", description: "" }])}>
            <Plus className="h-4 w-4" /> Add a service
          </Button>
        )}
      </Section>

      <Section title="Portfolio gallery" description={`Show your best work: screenshots, book covers, article snippets or storyboards. Up to ${MAX_GALLERY} images.`}>
        {gallery.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((g, i) => (
              <div key={g.url} className="space-y-2">
                <div className="relative overflow-hidden border-2 border-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.url} alt={g.caption || `Gallery image ${i + 1}`} className="aspect-video w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setGallery((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-2 top-2 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-black/70 text-white hover:bg-black"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  value={g.caption}
                  onChange={(e) => setGallery((prev) => prev.map((p, j) => (j === i ? { ...p, caption: e.target.value } : p)))}
                  placeholder="Caption (optional)"
                  maxLength={120}
                  className="h-10"
                />
              </div>
            ))}
          </div>
        )}
        {gallery.length < MAX_GALLERY && (
          <button
            type="button"
            onClick={() => galleryInput.current?.click()}
            disabled={uploading === "gallery"}
            className="flex w-full cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-ink bg-card p-8 text-sm text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-60"
          >
            <ImagePlus className="h-6 w-6" />
            {uploading === "gallery" ? "Uploading…" : "Add images (you can select several)"}
          </button>
        )}
        <input
          ref={galleryInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) onGallery(files);
            e.target.value = "";
          }}
        />
      </Section>

      <Section title="Contact and links" description="Add at least one way to reach you. Your contact details are shown publicly on your profile.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp} hint="With country code, e.g. +234 801 234 5678">
            <Input id="whatsapp" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} aria-invalid={!!errors.whatsapp} />
          </Field>
          <Field label="Phone" htmlFor="phone" error={errors.phone}>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" aria-invalid={!!errors.phone} />
          </Field>
          <Field label="Portfolio or website" htmlFor="portfolio" error={errors.portfolioUrl}>
            <Input id="portfolio" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="yourname.com" aria-invalid={!!errors.portfolioUrl} />
          </Field>
          <Field label="LinkedIn" htmlFor="linkedin" error={errors.linkedinUrl}>
            <Input id="linkedin" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="linkedin.com/in/yourname" aria-invalid={!!errors.linkedinUrl} />
          </Field>
          <Field label="X username" htmlFor="x" error={errors.xHandle}>
            <Input id="x" value={xHandle} onChange={(e) => setXHandle(e.target.value)} placeholder="yourname" aria-invalid={!!errors.xHandle} />
          </Field>
          <Field label="Facebook username" htmlFor="facebook" error={errors.facebookHandle}>
            <Input id="facebook" value={facebookHandle} onChange={(e) => setFacebookHandle(e.target.value)} placeholder="yourname" aria-invalid={!!errors.facebookHandle} />
          </Field>
          <Field label="Instagram username" htmlFor="instagram" error={errors.instagramHandle}>
            <Input id="instagram" value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} placeholder="yourname" aria-invalid={!!errors.instagramHandle} />
          </Field>
        </div>
      </Section>

      <Section title="Visibility">
        <Toggle checked={isPublished} onChange={setIsPublished} label="Show my profile on Lucenta" description="Turn this off to hide your profile without deleting it." />
        <Toggle checked={isAvailable} onChange={setIsAvailable} label="Available for new work" description="Shows an “Available” badge on your profile." />
      </Section>

      {listErrors.length > 0 && (
        <Alert tone="danger" title="Some services or gallery items need attention">
          {listErrors[0][1]}
        </Alert>
      )}

      <p className="text-sm text-muted-foreground">
        By saving, you confirm your details are accurate and you agree to the{" "}
        <Link href="/terms#freelancers" className="text-primary hover:underline">
          freelancer rules
        </Link>
        , including never writing graded work for students.
      </p>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur-md lg:-mx-8 lg:px-8">
        <div className="flex gap-2">
          {initial && (
            <Button type="button" variant="ghost" onClick={onDelete} loading={deleting} className="text-rose-500">
              <Trash2 className="h-4 w-4" /> Delete profile
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {initial?.is_published && (
            <Link href={`/freelancers/${initial.slug}`} target="_blank" className={buttonVariants({ variant: "outline" })}>
              <ExternalLink className="h-4 w-4" /> View public profile
            </Link>
          )}
          <Button type="button" onClick={onSave} loading={pending} disabled={uploading !== null}>
            {initial ? "Save changes" : "Publish my profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}
