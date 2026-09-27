"use client";

import { useState } from "react";
import { FieldError, Input, Label } from "@/components/ui/input";
import { OCCUPATION_LOCK_DAYS, OCCUPATIONS, REFERRAL_SOURCES } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };

function ChoiceGroup({
  name,
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  options: readonly Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.id}
            className={cn(
              "cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary",
              value === option.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export type AboutYouValues = { occupation: string; referralSource: string; referralOther: string };

/** Occupation and "how did you hear about us" fields, shared by onboarding and settings. */
export function AboutYouFields({
  defaults,
  errors,
  occupationLockedUntil,
}: {
  defaults: AboutYouValues;
  errors?: Record<string, string[] | undefined>;
  occupationLockedUntil?: string | null;
}) {
  const [occupation, setOccupation] = useState(defaults.occupation);
  const [referral, setReferral] = useState(defaults.referralSource);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <ChoiceGroup
          name="occupation"
          label="What do you do?"
          options={OCCUPATIONS}
          value={occupation}
          onChange={setOccupation}
          disabled={!!occupationLockedUntil}
        />
        {occupationLockedUntil && <input type="hidden" name="occupation" value={occupation} />}
        {occupationLockedUntil ? (
          <p className="text-xs text-muted-foreground">You can change your occupation again after {occupationLockedUntil}.</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {occupation === "student" &&
              "Students can use the AI Detector and Website Analyzer. The Humanizer isn't available for student accounts, to support academic integrity. "}
            Choose carefully: you can only change your occupation once every {OCCUPATION_LOCK_DAYS} days.
          </p>
        )}
        <FieldError message={errors?.occupation} />
      </div>

      <div className="space-y-2">
        <ChoiceGroup
          name="referralSource"
          label="How did you hear about Lucenta?"
          options={REFERRAL_SOURCES}
          value={referral}
          onChange={setReferral}
        />
        <FieldError message={errors?.referralSource} />
      </div>

      {referral === "other" && (
        <div className="space-y-2">
          <Label htmlFor="referralOther">Where did you hear about us?</Label>
          <Input
            id="referralOther"
            name="referralOther"
            maxLength={100}
            placeholder="e.g. a friend, Google search, a YouTube video"
            defaultValue={defaults.referralOther}
            aria-invalid={!!errors?.referralOther}
          />
          <FieldError message={errors?.referralOther} />
        </div>
      )}
    </div>
  );
}
