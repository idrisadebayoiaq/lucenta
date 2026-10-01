import type { Tables } from "@/lib/supabase/database.types";

export type Role = Tables<"profiles">["role"];

export const ROLE_LABELS: Record<Role, string> = { member: "Member", admin: "Admin", super_admin: "Super admin" };

export const isStaff = (role: Role | null | undefined) => role === "admin" || role === "super_admin";
