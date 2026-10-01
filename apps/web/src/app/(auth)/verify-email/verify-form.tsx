"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { resendEmailCode, verifyEmailCode, type AuthState } from "../actions";

export function VerifyForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyEmailCode, {});
  const [resendState, resendAction, resending] = useActionState<AuthState, FormData>(resendEmailCode, {});

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="email" value={email} />
        <div className="space-y-2">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={12}
            autoFocus
            className="h-16 text-center font-mono text-3xl font-bold tracking-[0.45em]"
            aria-invalid={!!state.fieldErrors?.code}
            required
          />
          <FieldError message={state.fieldErrors?.code} />
        </div>
        <Button type="submit" className="w-full" loading={pending}>
          Verify and continue
        </Button>
      </form>

      <form action={resendAction} className="space-y-3 text-center">
        <input type="hidden" name="email" value={email} />
        {resendState.error && <Alert tone="danger" title={resendState.error} />}
        {resendState.success && <Alert tone="success" title={resendState.success} />}
        <p className="text-sm text-muted-foreground">
          Didn&apos;t get it? Check your spam folder, or{" "}
          <button type="submit" disabled={resending} className="cursor-pointer font-medium text-primary hover:underline disabled:opacity-60">
            {resending ? "sending…" : "send a new code"}
          </button>
          .
        </p>
      </form>
    </div>
  );
}
