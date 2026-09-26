"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { buttonVariants, type Variant } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthStatus = "loading" | "signed-in" | "signed-out";

const AuthStatusContext = createContext<AuthStatus>("loading");

/** Reads the session from the browser so marketing pages can stay static (no per-request cookie reads). */
export function AuthStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setStatus(data.session ? "signed-in" : "signed-out"));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setStatus(session ? "signed-in" : "signed-out"));
    return () => subscription.unsubscribe();
  }, []);

  return <AuthStatusContext.Provider value={status}>{children}</AuthStatusContext.Provider>;
}

export function useAuthStatus() {
  return useContext(AuthStatusContext);
}

export function HeaderAuth() {
  const status = useAuthStatus();

  if (status === "signed-in") {
    return (
      <Link href="/dashboard" className={buttonVariants({ variant: "contrast", size: "sm" })}>
        Dashboard
      </Link>
    );
  }
  return (
    // Hidden (not removed) while loading so signed-in users never see these flash and the header doesn't shift.
    <div className={cn("flex items-center gap-2", status === "loading" && "invisible")}>
      <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm", className: "hidden sm:inline-flex" })}>
        Log in
      </Link>
      <Link href="/signup" className={buttonVariants({ variant: "contrast", size: "sm" })}>
        Sign up
      </Link>
    </div>
  );
}

type CtaProps = {
  signedOutLabel?: string;
  signedInLabel?: string;
  signedOutHref?: string;
  signedInHref?: string;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** Primary call to action: "Create free account" for visitors, "Go to dashboard" for signed-in users. */
export function AuthCta({
  signedOutLabel = "Create free account",
  signedInLabel = "Go to dashboard",
  signedOutHref = "/signup",
  signedInHref = "/dashboard",
  variant,
  size = "lg",
  className,
}: CtaProps) {
  const status = useAuthStatus();
  const signedIn = status === "signed-in";
  return (
    <Link
      href={signedIn ? signedInHref : signedOutHref}
      className={buttonVariants({ variant, size, className: cn(className, status === "loading" && "invisible") })}
    >
      {signedIn ? signedInLabel : signedOutLabel}
    </Link>
  );
}
