import { z } from "zod";

// Keep in sync with the check constraints in supabase/migrations/0011_onboarding.sql.
export const OCCUPATIONS = [
  { id: "student", label: "Student" },
  { id: "educator", label: "Teacher or educator" },
  { id: "content_creator", label: "Content creator" },
  { id: "marketer", label: "Marketer" },
  { id: "writer", label: "Writer or editor" },
  { id: "business_owner", label: "Business owner" },
  { id: "developer", label: "Developer or engineer" },
  { id: "designer", label: "Designer" },
  { id: "freelancer", label: "Freelancer" },
  { id: "other", label: "Other" },
] as const;

export const REFERRAL_SOURCES = [
  { id: "cursor", label: "Cursor" },
  { id: "x", label: "X (Twitter)" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
  { id: "ads", label: "Ads" },
  { id: "other", label: "Other" },
] as const;

export type Occupation = (typeof OCCUPATIONS)[number]["id"];
export type ReferralSource = (typeof REFERRAL_SOURCES)[number]["id"];

export const STUDENT_OCCUPATION_LOCK_DAYS = 30;

/** Students can use every tool except the Humanizer. */
export function canUseHumanizer(occupation: string | null | undefined) {
  return occupation !== "student";
}

export function occupationLabel(id: string | null | undefined) {
  return OCCUPATIONS.find((o) => o.id === id)?.label ?? null;
}

/** When a student may next change occupation, or null if they can change it now. */
export function occupationUnlockDate(occupation: string | null, updatedAt: string | null): Date | null {
  if (occupation !== "student" || !updatedAt) return null;
  const unlock = new Date(new Date(updatedAt).getTime() + STUDENT_OCCUPATION_LOCK_DAYS * 86_400_000);
  return unlock > new Date() ? unlock : null;
}

export const aboutYouSchema = z
  .object({
    occupation: z.enum(OCCUPATIONS.map((o) => o.id) as [Occupation, ...Occupation[]], {
      message: "Choose your occupation",
    }),
    referralSource: z.enum(REFERRAL_SOURCES.map((r) => r.id) as [ReferralSource, ...ReferralSource[]], {
      message: "Tell us how you heard about Lucenta",
    }),
    referralOther: z.string().trim().max(100, "Keep it under 100 characters").optional().default(""),
  })
  .refine((d) => d.referralSource !== "other" || d.referralOther.length >= 2, {
    message: "Please tell us where you heard about Lucenta",
    path: ["referralOther"],
  });
