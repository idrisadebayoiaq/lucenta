"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AuthCta, useAuthStatus } from "@/components/auth-state";
import { Logo } from "@/components/logo";
import { Button, buttonVariants } from "@/components/ui/button";

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const status = useAuthStatus();
  const close = () => setOpen(false);

  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-[#5b7083]/40" onClick={close} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-1 overflow-y-auto bg-background p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <Button variant="ghost" size="icon" onClick={close} aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Link href="/" onClick={close} className="rounded-full px-4 py-3 text-lg font-bold hover:bg-muted">
              Home
            </Link>
            {items.map((item) => (
              <Link key={item.href} href={item.href} onClick={close} className="rounded-full px-4 py-3 text-lg font-bold hover:bg-muted">
                {item.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2">
              <AuthCta signedOutLabel="Sign up free" className="w-full" />
              {status === "signed-out" && (
                <Link href="/login" onClick={close} className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}>
                  Log in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
