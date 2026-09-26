"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkSignupAllowed, getDeviceContext, recordDevice } from "@/lib/account-guard";
import { birthDateSchema } from "@/lib/age";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Add at least one uppercase letter")
  .regex(/[a-z]/, "Add at least one lowercase letter")
  .regex(/\d/, "Add at least one number")
  .regex(/[^A-Za-z0-9]/, "Add at least one symbol");

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.email("Enter a valid email address"),
    birthDate: birthDateSchema,
    password,
    confirmPassword: z.string(),
    terms: z.literal("on", { message: "You must accept the terms" }),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

async function origin() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_APP_URL || h.get("origin") || "http://localhost:3000";
}

function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = signupSchema.safeParse(raw);
  const values = {
    fullName: raw.fullName ?? "",
    email: raw.email ?? "",
    birthDate: raw.birthDate ?? "",
    terms: raw.terms ?? "",
  };
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const device = await getDeviceContext(formData.get("deviceId"));
  const guard = await checkSignupAllowed(device);
  if (!guard.allowed) return { error: guard.message, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, birth_date: parsed.data.birthDate },
      emailRedirectTo: `${await origin()}/auth/callback?next=/dashboard`,
    },
  });

  if (error) return { error: error.message, values };

  // An existing email comes back as a user with no identities; only record genuinely new accounts.
  if (data.user && (data.user.identities?.length ?? 0) > 0) {
    await recordDevice(device, data.user.id, "signup");
  }

  if (data.session) redirect("/dashboard");

  return {
    success: `We sent a confirmation link to ${parsed.data.email}. Click it to activate your account.`,
  };
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = loginSchema.safeParse(raw);
  const values = { email: raw.email ?? "" };
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "Please confirm your email address first. Check your inbox for the link."
        : "Incorrect email or password.";
    return { error: message, values };
  }

  try {
    await recordDevice(await getDeviceContext(formData.get("deviceId")), data.user.id, "login");
  } catch (e) {
    console.error("Failed to record login device", e);
  }

  redirect(safeNext(formData.get("next")));
}

export async function signInWithGoogle(formData: FormData) {
  await getDeviceContext(formData.get("deviceId"));
  const supabase = await createClient();
  const next = safeNext(formData.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/login?error=${encodeURIComponent("Google sign-in is not configured yet.")}`);
  redirect(data.url);
}

export async function forgotPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({ email: z.email("Enter a valid email address") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });

  return { success: "If an account exists for that email, a password reset link is on its way." };
}

export async function resetPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({ password, confirmPassword: z.string() })
    .refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  redirect("/dashboard?passwordReset=1");
}

export async function saveBirthDate(_: AuthState, formData: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = z.object({ birthDate: birthDateSchema }).safeParse(Object.fromEntries(formData));
  const values = { birthDate: String(formData.get("birthDate") ?? "") };
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ birth_date: parsed.data.birthDate }).eq("id", user.id);
  if (error) return { error: "We couldn't save your date of birth. Please try again.", values };

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
