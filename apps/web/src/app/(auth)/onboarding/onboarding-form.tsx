"use client";

import { useActionState } from "react";
import { AboutYouFields, type AboutYouValues } from "@/components/about-you-fields";
import { DeviceIdInput } from "@/components/device-id-input";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { latestAllowedBirthDate, MIN_AGE } from "@/lib/age";
import { completeOnboarding, signOut, type AuthState } from "../actions";

export function OnboardingForm({
  next,
  needsBirthDate,
  defaults,
}: {
  next: string;
  needsBirthDate: boolean;
  defaults: AboutYouValues;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(completeOnboarding, {});
  const values: AboutYouValues = {
    occupation: state.values?.occupation ?? defaults.occupation,
    referralSource: state.values?.referralSource ?? defaults.referralSource,
    referralOther: state.values?.referralOther ?? defaults.referralOther,
  };

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-6" noValidate>
        <input type="hidden" name="next" value={next} />
        <DeviceIdInput />
        {state.error && <Alert tone="danger" title={state.error} />}

        {needsBirthDate && (
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
        )}

        <AboutYouFields key={JSON.stringify(state.values ?? {})} defaults={values} errors={state.fieldErrors} />

        <Button type="submit" className="w-full" loading={pending}>
          Continue to dashboard
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
