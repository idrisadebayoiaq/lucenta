"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  FREELANCER_KINDS,
  isAdult,
  MAX_GALLERY,
  MAX_LANGUAGES,
  MAX_SERVICES,
  MAX_SKILLS,
  MAX_SPECIALTIES,
  SPECIALTIES,
  type FreelancerKind,
} from "@/lib/freelancers";
import { createClient, getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";

export type SaveResult = { error?: string; fieldErrors?: Record<string, string>; slug?: string };

const text = (min: number, max: number, label: string) =>
  z.string().trim().min(min, min > 1 ? `${label} must be at least ${min} characters` : `Enter your ${label.toLowerCase()}`).max(max, `${label} must be ${max} characters or fewer`);

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .transform((v) => v || null);

const url = z
  .string()
  .trim()
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v) || null)
  .refine((v) => v === null || z.url().safeParse(v).success, "Enter a valid URL");

const handle = z
  .string()
  .trim()
  .transform((v) => v.replace(/^https?:\/\/(www\.)?(x|twitter|facebook|instagram)\.com\//i, "").replace(/^@/, "").replace(/\/$/, "") || null)
  .refine((v) => v === null || /^[A-Za-z0-9._]{1,50}$/.test(v), "Use just your username, e.g. janedoe");

const phone = (label: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s()-]/g, "") || null)
    .refine((v) => v === null || /^\+\d{7,15}$/.test(v), `Enter your ${label} number with the country code, e.g. +234 801 234 5678`);

const list = (max: number, itemMax: number, label: string) =>
  z
    .array(z.string().trim().min(1).max(itemMax, `Each ${label} must be ${itemMax} characters or fewer`))
    .max(max, `Add up to ${max} ${label}s`)
    .transform((items) => [...new Set(items)]);

function buildSchema(userId: string) {
  const ownImage = (bucket: "freelancers" | "avatars") => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${userId}/`;
  const isOwnImage = (v: string) => v.startsWith(ownImage("freelancers")) || v.startsWith(ownImage("avatars"));

  return z
    .object({
      kind: z.enum(FREELANCER_KINDS.map((k) => k.id) as [FreelancerKind, ...FreelancerKind[]], { message: "Choose developer or writer" }),
      name: text(2, 80, "Name"),
      headline: text(3, 80, "Headline"),
      bio: text(30, 1500, "Bio"),
      location: optional(80),
      experience: optional(60),
      startingRate: optional(60),
      languages: list(MAX_LANGUAGES, 30, "language"),
      specialties: z.array(z.string()).min(1, "Pick at least one specialty").max(MAX_SPECIALTIES, `Pick up to ${MAX_SPECIALTIES} specialties`),
      skills: list(MAX_SKILLS, 30, "skill"),
      services: z
        .array(z.object({ title: text(2, 60, "Service name"), description: z.string().trim().max(300, "Service description must be 300 characters or fewer") }))
        .max(MAX_SERVICES, `Add up to ${MAX_SERVICES} services`),
      email: z
        .string()
        .trim()
        .transform((v) => v || null)
        .refine((v) => v === null || z.email().safeParse(v).success, "Enter a valid email address"),
      whatsapp: phone("WhatsApp"),
      phone: phone("phone"),
      portfolioUrl: url,
      linkedinUrl: url.refine((v) => v === null || /linkedin\.com\//i.test(v), "Enter your LinkedIn profile URL"),
      xHandle: handle,
      facebookHandle: handle,
      instagramHandle: handle,
      avatarUrl: z
        .string()
        .nullable()
        .refine((v) => v === null || isOwnImage(v), "Upload your photo again"),
      gallery: z
        .array(z.object({ url: z.string().refine((v) => v.startsWith(ownImage("freelancers")), "Upload this image again"), caption: z.string().trim().max(120, "Captions must be 120 characters or fewer") }))
        .max(MAX_GALLERY, `Add up to ${MAX_GALLERY} images`),
      isPublished: z.boolean(),
      isAvailable: z.boolean(),
    })
    .superRefine((d, ctx) => {
      const allowed = new Set<string>(SPECIALTIES[d.kind].map((s) => s.id));
      if (d.specialties.some((s) => !allowed.has(s))) ctx.addIssue({ code: "custom", path: ["specialties"], message: "Pick specialties from the list" });
      if (!d.email && !d.whatsapp && !d.phone) ctx.addIssue({ code: "custom", path: ["email"], message: "Add at least one way to contact you: email, WhatsApp or phone" });
    });
}

export type FreelancerInput = z.input<ReturnType<typeof buildSchema>>;

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50)
      .replace(/^-|-$/g, "") || "freelancer"
  ).padEnd(3, "x");
}

async function removeUnusedImages(userId: string, keep: (string | null)[]) {
  const supabase = await createClient();
  const { data: files } = await supabase.storage.from("freelancers").list(userId, { limit: 100 });
  const used = new Set(keep.filter(Boolean).map((u) => u!.split("/").pop()));
  const stale = (files ?? []).filter((f) => !used.has(f.name)).map((f) => `${userId}/${f.name}`);
  if (stale.length) await supabase.storage.from("freelancers").remove(stale);
}

function revalidateDirectory(slug?: string) {
  revalidatePath("/freelancers");
  if (slug) revalidatePath(`/freelancers/${slug}`);
  revalidatePath("/");
  revalidatePath("/dashboard/freelancer");
}

export async function saveFreelancerProfile(input: FreelancerInput): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };
  const profile = await getCurrentProfile();
  if (!isAdult(profile?.birth_date)) return { error: "You must be 18 or older to create a freelancer profile." };

  const parsed = buildSchema(user.id).safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const d = parsed.data;
  const values = {
    kind: d.kind,
    name: d.name,
    headline: d.headline,
    bio: d.bio,
    location: d.location,
    experience: d.experience,
    starting_rate: d.startingRate,
    languages: d.languages,
    specialties: d.specialties,
    skills: d.skills,
    services: d.services,
    email: d.email,
    whatsapp: d.whatsapp,
    phone: d.phone,
    portfolio_url: d.portfolioUrl,
    linkedin_url: d.linkedinUrl,
    x_handle: d.xHandle,
    facebook_handle: d.facebookHandle,
    instagram_handle: d.instagramHandle,
    avatar_url: d.avatarUrl,
    gallery: d.gallery,
    is_published: d.isPublished,
    is_available: d.isAvailable,
  };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("developers").select("id, slug").eq("user_id", user.id).maybeSingle();

  let slug = existing?.slug;
  if (existing) {
    const { error } = await supabase.from("developers").update(values).eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const base = slugify(d.name);
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = attempt === 0 ? base : `${base.slice(0, 45)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("developers").insert({ ...values, user_id: user.id, slug: candidate });
      if (!error) {
        slug = candidate;
        break;
      }
      if (error.code !== "23505") return { error: error.message };
    }
    if (!slug) return { error: "Couldn't create your profile. Please try again." };
  }

  await removeUnusedImages(user.id, [d.avatarUrl, ...d.gallery.map((g) => g.url)]);
  revalidateDirectory(slug);
  return { slug };
}

export async function deleteFreelancerProfile(): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("developers").select("slug").eq("user_id", user.id).maybeSingle();
  const { error } = await supabase.from("developers").delete().eq("user_id", user.id);
  if (error) return { error: error.message };
  await removeUnusedImages(user.id, []);
  revalidateDirectory(existing?.slug);
  return {};
}
