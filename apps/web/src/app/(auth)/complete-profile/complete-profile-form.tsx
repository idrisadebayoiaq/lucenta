"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { latestAllowedBirthDate, MIN_AGE } from "@/lib/age";
import { saveBirthDate, signOut, type AuthState } from "../actions";

export function CompleteProfileForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(saveBirthDate, {});

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        {state.error && <Alert tone="danger" title={state.error} />}
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
        <Button type="submit" className="w-full" loading={pending}>
          Continue
        </Button>
      </form>
      <form action={signOut}>
        <Button type="submit" variant="ghost" className="w-full">
          Log out
        </Button>
      </form>
    </div>
  );
}
