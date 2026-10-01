"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ userId: z.uuid(), role: z.enum(["member", "admin"]) });

export async function setUserRole(userId: string, role: "member" | "admin") {
  const parsed = schema.safeParse({ userId, role });
  if (!parsed.success) return { error: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_user: parsed.data.userId, p_role: parsed.data.role });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/users");
  return { success: true };
}
