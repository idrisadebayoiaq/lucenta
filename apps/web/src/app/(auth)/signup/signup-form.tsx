"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { PasswordInput, PasswordStrength } from "@/components/ui/password-input";
import { signup, type AuthState } from "../actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, {});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  if (state.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
          <MailCheck className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">{state.success}</p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Back to log in
        </Link>
      </div>
    );
  }

  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="danger" title={state.error} />}
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          placeholder="Jane Doe"
          defaultValue={state.values?.fullName}
          aria-invalid={!!state.fieldErrors?.fullName}
          required
        />
        <FieldError message={state.fieldErrors?.fullName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          aria-invalid={!!state.fieldErrors?.email}
          required
        />
        <FieldError message={state.fieldErrors?.email} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!state.fieldErrors?.password}
          required
        />
        <FieldError message={state.fieldErrors?.password} />
        <PasswordStrength password={password} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch || !!state.fieldErrors?.confirmPassword}
          required
        />
        <FieldError message={mismatch ? "Passwords don't match" : state.fieldErrors?.confirmPassword} />
      </div>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="terms"
          defaultChecked={state.values?.terms === "on"}
          key={state.values?.terms ?? "unset"}
          className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="text-primary hover:underline">
            Terms of Use
          </Link>
          ,{" "}
          <Link href="/responsible-use" target="_blank" className="text-primary hover:underline">
            Responsible Use Policy
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          , and I won&apos;t use Lucenta for academic dishonesty or deception.
        </span>
      </label>
      <FieldError message={state.fieldErrors?.terms} />
      <Button type="submit" className="w-full" loading={pending}>
        Create account
      </Button>
    </form>
  );
}
