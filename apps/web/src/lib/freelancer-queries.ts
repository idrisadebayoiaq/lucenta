import "server-only";
import { toFreelancer, type Freelancer, type FreelancerKind } from "@/lib/freelancers";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export async function getFreelancers(kind?: FreelancerKind): Promise<Freelancer[]> {
  const supabase = createPublicClient();
  let query = supabase.from("developers").select("*").eq("is_published", true);
  if (kind) query = query.eq("kind", kind);
  const { data } = await query.order("sort_order").order("created_at");
  return (data ?? []).map(toFreelancer);
}

export async function getFreelancerBySlug(slug: string): Promise<Freelancer | null> {
  const supabase = createPublicClient();
  const { data } = await supabase.from("developers").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  return data ? toFreelancer(data) : null;
}

/** The signed-in user's own listing, published or not. */
export async function getMyFreelancerProfile(userId: string): Promise<Freelancer | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("developers").select("*").eq("user_id", userId).maybeSingle();
  return data ? toFreelancer(data) : null;
}
