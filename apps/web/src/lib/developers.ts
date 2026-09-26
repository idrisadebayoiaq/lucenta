import type { Tables } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";

export type DeveloperService = { title: string; description: string };
export type Developer = Omit<Tables<"developers">, "services"> & { services: DeveloperService[] };

export async function getDevelopers(): Promise<Developer[]> {
  const supabase = createPublicClient();
  const { data } = await supabase.from("developers").select("*").order("sort_order").order("created_at");
  return (data ?? []).map((d) => ({ ...d, services: Array.isArray(d.services) ? (d.services as DeveloperService[]) : [] }));
}

export function contactLinks(dev: Developer, context?: { siteUrl?: string }) {
  const message = context?.siteUrl
    ? `Hi ${dev.name.split(" ")[0]}, I just audited ${context.siteUrl} on Lucenta and I'd like help fixing the issues in the report.`
    : `Hi ${dev.name.split(" ")[0]}, I found you on Lucenta and I'd like help with my website.`;
  const subject = context?.siteUrl ? `Help fixing ${context.siteUrl} (Lucenta report)` : "Website help (via Lucenta)";

  return {
    whatsapp: dev.whatsapp ? `https://wa.me/${dev.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}` : null,
    email: dev.email ? `mailto:${dev.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}` : null,
    phone: dev.phone ? `tel:${dev.phone.replace(/[^\d+]/g, "")}` : null,
    portfolio: dev.portfolio_url,
    x: dev.x_handle ? `https://x.com/${dev.x_handle}` : null,
    facebook: dev.facebook_handle ? `https://facebook.com/${dev.facebook_handle}` : null,
    instagram: dev.instagram_handle ? `https://instagram.com/${dev.instagram_handle}` : null,
  };
}

/** Local-format display for Nigerian numbers stored in international format. */
export function displayPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("234") ? `0${digits.slice(3)}` : value;
}
