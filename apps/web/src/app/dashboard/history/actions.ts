"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

const idsSchema = z.array(z.uuid()).min(1).max(200);

export async function deleteItems(kind: "scans" | "text_checks", ids: string[]) {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { error: "Invalid selection." };

  const supabase = await createClient();
  const { error } = await supabase.from(kind).delete().in("id", parsed.data).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function renameTextCheck(id: string, title: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };
  const parsed = z.object({ id: z.uuid(), title: z.string().trim().min(1).max(120) }).safeParse({ id, title });
  if (!parsed.success) return { error: "Enter a title between 1 and 120 characters." };

  const supabase = await createClient();
  const { error } = await supabase.from("text_checks").update({ title: parsed.data.title }).eq("id", parsed.data.id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
