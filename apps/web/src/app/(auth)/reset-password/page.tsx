"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { PasswordInput, PasswordStrength } from "@/components/ui/password-input";
import { resetPassword, type AuthState } from "../actions";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, {});
  const [password, setPassword] = useState("");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Make it strong and unique.</p>
      <form action={action} className="mt-6 space-y-4" noValidate>
        {state.error && <Alert tone="danger" title={state.error} />}
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <FieldError message={state.fieldErrors?.password} />
          <PasswordStrength password={password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required />
          <FieldError message={state.fieldErrors?.confirmPassword} />
        </div>
        <Button type="submit" className="w-full" loading={pending}>
          Update password
        </Button>
      </form>
    </div>
  );
}
