"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setUserRole } from "./actions";

export function RoleButton({ userId, name, isAdmin }: { userId: string; name: string; isAdmin: boolean }) {
  const [pending, start] = useTransition();

  function onClick() {
    const next = isAdmin ? "member" : "admin";
    const question = isAdmin ? `Remove admin access from ${name}?` : `Make ${name} an admin? They'll be able to see the user directory and analytics.`;
    if (!window.confirm(question)) return;
    start(async () => {
      const res = await setUserRole(userId, next);
      if (res.error) toast.error(res.error);
      else toast.success(isAdmin ? `${name} is now a member.` : `${name} is now an admin.`);
    });
  }

  return (
    <Button size="sm" variant={isAdmin ? "outline" : "default"} onClick={onClick} loading={pending}>
      {isAdmin ? "Remove admin" : "Make admin"}
    </Button>
  );
}
