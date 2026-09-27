import type { Tables } from "@/lib/supabase/database.types";

export const FREELANCER_KINDS = [
  { id: "developer", label: "Developer", plural: "Developers" },
  { id: "writer", label: "Writer", plural: "Writers" },
] as const;

export type FreelancerKind = (typeof FREELANCER_KINDS)[number]["id"];

// Keep ids in sync with the seeded values in supabase/migrations/0015_freelancer_profiles.sql.
export const SPECIALTIES = {
  developer: [
    { id: "full_stack", label: "Full stack development" },
    { id: "frontend", label: "Frontend development" },
    { id: "backend", label: "Backend & APIs" },
    { id: "web_design", label: "Web design & UI" },
    { id: "performance", label: "Speed & performance" },
    { id: "technical_seo", label: "Technical SEO" },
    { id: "security", label: "Website security" },
    { id: "accessibility", label: "Accessibility" },
    { id: "wordpress", label: "WordPress" },
    { id: "shopify", label: "Shopify & e-commerce" },
    { id: "mobile", label: "Mobile apps" },
    { id: "maintenance", label: "Maintenance & bug fixes" },
  ],
  writer: [
    { id: "seo_writing", label: "SEO & blog writing" },
    { id: "copywriting", label: "Copywriting & ads" },
    { id: "book_writing", label: "Book & fiction writing" },
    { id: "script_writing", label: "Script & screenwriting" },
    { id: "ghostwriting", label: "Ghostwriting" },
    { id: "technical_writing", label: "Technical writing" },
    { id: "social_media", label: "Social media content" },
    { id: "email_newsletters", label: "Emails & newsletters" },
    { id: "business_writing", label: "Business writing & proposals" },
    { id: "editing", label: "Editing & proofreading" },
    { id: "translation", label: "Translation" },
  ],
} as const satisfies Record<FreelancerKind, readonly { id: string; label: string }[]>;

export type Specialty = (typeof SPECIALTIES)[FreelancerKind][number]["id"];
export type DeveloperSpecialty = (typeof SPECIALTIES)["developer"][number]["id"];
export type WriterSpecialty = (typeof SPECIALTIES)["writer"][number]["id"];

export const MAX_SPECIALTIES = 6;
export const MAX_SKILLS = 15;
export const MAX_SERVICES = 6;
export const MAX_GALLERY = 6;
export const MAX_LANGUAGES = 6;
/** Must match the freelancers storage bucket limit. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const FREELANCER_MIN_AGE = 18;

export function specialtyLabel(id: string) {
  for (const list of Object.values(SPECIALTIES)) {
    const found = list.find((s) => s.id === id);
    if (found) return found.label;
  }
  return id;
}

export function kindLabel(kind: string, plural = false) {
  const found = FREELANCER_KINDS.find((k) => k.id === kind);
  return found ? (plural ? found.plural : found.label) : "Freelancer";
}

export type FreelancerService = { title: string; description: string };
export type GalleryItem = { url: string; caption: string };
export type Freelancer = Omit<Tables<"developers">, "services" | "gallery" | "kind"> & {
  kind: FreelancerKind;
  services: FreelancerService[];
  gallery: GalleryItem[];
};

export function toFreelancer(row: Tables<"developers">): Freelancer {
  return {
    ...row,
    kind: row.kind === "writer" ? "writer" : "developer",
    services: Array.isArray(row.services) ? (row.services as FreelancerService[]) : [],
    gallery: Array.isArray(row.gallery) ? (row.gallery as GalleryItem[]) : [],
  };
}

export function isAdult(birthDate: string | null | undefined) {
  if (!birthDate) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - FREELANCER_MIN_AGE);
  return new Date(birthDate) <= cutoff;
}

export type ContactContext = { siteUrl?: string; topic?: string };

export function contactLinks(f: Freelancer, context: ContactContext = {}) {
  const first = f.name.split(" ")[0];
  let message: string;
  let subject: string;
  if (context.siteUrl) {
    message = `Hi ${first}, I just audited ${context.siteUrl} on Lucenta and I'd like help fixing the issues in the report.`;
    subject = `Help fixing ${context.siteUrl} (Lucenta report)`;
  } else if (f.kind === "writer") {
    message = context.topic
      ? `Hi ${first}, I found you on Lucenta and I'd like help with ${context.topic.toLowerCase()}.`
      : `Hi ${first}, I found you on Lucenta and I'd like help with my writing.`;
    subject = "Writing help (via Lucenta)";
  } else {
    message = `Hi ${first}, I found you on Lucenta and I'd like help with my website.`;
    subject = "Website help (via Lucenta)";
  }

  return {
    whatsapp: f.whatsapp ? `https://wa.me/${f.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}` : null,
    email: f.email ? `mailto:${f.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}` : null,
    phone: f.phone ? `tel:${f.phone.replace(/[^\d+]/g, "")}` : null,
    portfolio: f.portfolio_url,
    linkedin: f.linkedin_url,
    x: f.x_handle ? `https://x.com/${f.x_handle}` : null,
    facebook: f.facebook_handle ? `https://facebook.com/${f.facebook_handle}` : null,
    instagram: f.instagram_handle ? `https://instagram.com/${f.instagram_handle}` : null,
  };
}

/** Local-format display for Nigerian numbers stored in international format. */
export function displayPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("234") ? `0${digits.slice(3)}` : value;
}
