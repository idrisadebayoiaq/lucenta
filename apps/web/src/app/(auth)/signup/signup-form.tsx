"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { DeviceIdInput } from "@/components/device-id-input";
import { latestAllowedBirthDate, MIN_AGE } from "@/lib/age";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { PasswordInput, PasswordStrength } from "@/components/ui/password-input";
import { signup, type AuthState } from "../actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, {});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <form action={action} className="space-y-4" noValidate>
      <DeviceIdInput />
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
        <Label htmlFor="birthDate">Date of birth</Label>
        <Input
          id="birthDate"
          name="birthDate"
          type="date"
          autoComplete="bday"
          max={latestAllowedBirthDate()}
          defaultValue={state.values?.birthDate}
          aria-invalid={!!state.fieldErrors?.birthDate}
          required
        />
        <p className="text-xs text-muted-foreground">You must be at least {MIN_AGE} years old. We never show your age publicly.</p>
        <FieldError message={state.fieldErrors?.birthDate} />
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
