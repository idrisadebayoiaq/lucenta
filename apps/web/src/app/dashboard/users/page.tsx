import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown, Search, ShieldCheck, User, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge, EmptyState } from "@/components/ui/misc";
import { signAvatars } from "@/lib/avatars";
import { isStaff, ROLE_LABELS, type Role } from "@/lib/roles";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { cn, formatDate } from "@/lib/utils";
import { Avatar } from "../nav";
import { RoleButton } from "./role-button";

export const metadata: Metadata = { title: "Users" };

const FILTERS: { id: Role | "all"; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "super_admin", label: "Super admin" },
  { id: "admin", label: "Admins" },
  { id: "member", label: "Members" },
];

const ROLE_TONES = { super_admin: "warning", admin: "default", member: "outline" } as const;

export default async function UsersPage({ searchParams }: PageProps<"/dashboard/users">) {
  const me = await getCurrentProfile();
  if (!me || !isStaff(me.role)) notFound();

  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().toLowerCase();
  const filter = FILTERS.find((f) => f.id === params.role)?.id ?? "all";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_users");
  if (error || !data) throw new Error("Could not load users.");
  const photos = await signAvatars(supabase, data.map((u) => u.avatar_url));
  const users = data.map((u, i) => ({ ...u, photo: photos[i] }));

  const count = (role: Role) => users.filter((u) => u.role === role).length;
  const shown = users.filter(
    (u) =>
      (filter === "all" || u.role === filter) &&
      (!q || [u.full_name, u.email, u.username].some((v) => v?.toLowerCase().includes(q))),
  );
  const isSuper = me.role === "super_admin";
  const href = (role: string) => {
    const sp = new URLSearchParams();
    if (role !== "all") sp.set("role", role);
    if (q) sp.set("q", q);
    const s = sp.toString();
    return s ? `/dashboard/users?${s}` : "/dashboard/users";
  };

  const stats = [
    { icon: Users, label: "Accounts", value: users.length },
    { icon: Crown, label: "Super admin", value: count("super_admin") },
    { icon: ShieldCheck, label: "Admins", value: count("admin") },
    { icon: User, label: "Members", value: count("member") },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={
          isSuper
            ? "Everyone with a Lucenta account. You can make members admins or remove admin access."
            : "Everyone with a Lucenta account. Only the super admin can change roles."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="brutal p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm font-medium">{label}</span>
              <Icon className="h-4 w-4" />
            </div>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 border-2 border-ink bg-card p-1">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={href(f.id)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium",
                f.id === filter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <form action="/dashboard/users" className="relative sm:w-72">
          {filter !== "all" && <input type="hidden" name="role" value={filter} />}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search name, email or username" className="pl-9" />
        </form>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No users found" description="Try a different search or filter." />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {shown.map((u) => {
              const name = u.full_name || u.email || "Unnamed user";
              const canChange = isSuper && u.role !== "super_admin" && u.id !== me.id;
              return (
                <div key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar user={{ name: u.full_name, email: u.email, avatarUrl: u.photo }} size={44} />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        <span className="truncate">{name}</span>
                        {u.id === me.id && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                        <Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                        {!u.email_confirmed_at && <Badge tone="danger">Unverified</Badge>}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {u.email}
                        {u.username && ` · @${u.username}`}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm sm:w-80">
                    <div>
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <p className="font-medium capitalize">{u.plan}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Joined</p>
                      <p className="font-medium">{formatDate(u.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last seen</p>
                      <p className="font-medium">{u.last_sign_in_at ? formatDate(u.last_sign_in_at) : "Never"}</p>
                    </div>
                  </div>
                  <div className="sm:w-36 sm:text-right">
                    {canChange && <RoleButton userId={u.id} name={name} isAdmin={u.role === "admin"} />}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
