import { z } from "zod";

export const MIN_AGE = 16;
const MAX_AGE = 120;

export function ageOn(birthDate: string, today = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  let age = today.getUTCFullYear() - year;
  const beforeBirthday =
    today.getUTCMonth() < month - 1 || (today.getUTCMonth() === month - 1 && today.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

/** Latest date of birth that still meets the minimum age, as YYYY-MM-DD (for the date input's max). */
export function latestAllowedBirthDate(today = new Date()): string {
  const d = new Date(Date.UTC(today.getUTCFullYear() - MIN_AGE, today.getUTCMonth(), today.getUTCDate()));
  return d.toISOString().slice(0, 10);
}

export const birthDateSchema = z
  .string({ message: "Enter your date of birth" })
  .min(1, "Enter your date of birth")
  .superRefine((value, ctx) => {
    const age = ageOn(value);
    if (age === null || age < 0 || age > MAX_AGE) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date of birth" });
    } else if (age < MIN_AGE) {
      ctx.addIssue({ code: "custom", message: `You must be at least ${MIN_AGE} years old to use Lucenta` });
    }
  });
