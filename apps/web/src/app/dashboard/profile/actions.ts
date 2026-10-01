"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkEmailAllowed } from "@/lib/account-guard";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .transform((v) => v || null);

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v || null)
    .refine((v) => v === null || /^[a-z0-9_]{3,30}$/.test(v), "Use 3 to 30 characters: lowercase letters, numbers and underscores"),
  bio: optionalText(500),
  company: optionalText(80),
  jobTitle: optionalText(80),
  location: optionalText(80),
  website: z
    .string()
    .trim()
    .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v) || null)
    .refine((v) => v === null || z.url().safeParse(v).success, "Enter a valid URL"),
});

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: d.fullName,
      username: d.username,
      bio: d.bio,
      company: d.company,
      job_title: d.jobTitle,
      location: d.location,
      website: d.website,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { fieldErrors: { username: ["That username is already taken"] } };
    return { error: error.message };
  }

  await supabase.auth.updateUser({ data: { full_name: d.fullName } });
  revalidatePath("/dashboard", "layout");
  return { success: "Profile updated." };
}

export async function setAvatarUrl(avatarUrl: string | null) {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };

  const supabase = await createClient();
  if (avatarUrl && !avatarUrl.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`)) {
    return { error: "Invalid avatar URL." };
  }

  if (!avatarUrl) {
    const { data: files } = await supabase.storage.from("avatars").list(user.id);
    if (files?.length) await supabase.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function changeEmail(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ email: z.email("Enter a valid email address") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const user = await getCurrentUser();
  if (!user) return { error: "Please log in again." };
  const emailCheck = await checkEmailAllowed(parsed.data.email, user.id);
  if (!emailCheck.allowed) return { fieldErrors: { email: [emailCheck.message] } };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback?next=/dashboard/profile` },
  );
  if (error) return { error: error.message };
  return { success: `Confirmation links were sent to your current and new email addresses.` };
}

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Add at least one uppercase letter")
  .regex(/[a-z]/, "Add at least one lowercase letter")
  .regex(/\d/, "Add at least one number")
  .regex(/[^A-Za-z0-9]/, "Add at least one symbol");

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user?.email) return { error: "You are not signed in." };

  const parsed = z
    .object({ currentPassword: z.string().min(1, "Enter your current password"), newPassword: strongPassword, confirmPassword: z.string() })
    .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.currentPassword });
  if (verifyError) return { fieldErrors: { currentPassword: ["Current password is incorrect"] } };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) return { error: error.message };
  return { success: "Password changed." };
}

export async function deleteAllHistory() {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };
  const supabase = await createClient();
  const [comparisons, scans, texts] = await Promise.all([
    supabase.from("comparisons").delete().eq("user_id", user.id),
    supabase.from("scans").delete().eq("user_id", user.id),
    supabase.from("text_checks").delete().eq("user_id", user.id),
  ]);
  const failed = comparisons.error ?? scans.error ?? texts.error;
  if (failed) return { error: failed.message };
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function deleteAccount(_: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("confirm") !== "DELETE") return { fieldErrors: { confirm: ['Type "DELETE" to confirm'] } };

  const user = await getCurrentUser();
  if (!user) return { error: "You need to be logged in." };

  const supabase = await createClient();
  for (const bucket of ["avatars", "freelancers"]) {
    const { data: files } = await supabase.storage.from(bucket).list(user.id, { limit: 100 });
    if (files?.length) await supabase.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await supabase.rpc("delete_current_user");
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect("/?accountDeleted=1");
}
