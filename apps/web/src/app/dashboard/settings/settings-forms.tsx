"use client";

import { useActionState, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { AboutYouFields, type AboutYouValues } from "@/components/about-you-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { updateAboutYou, updatePreferences, type SettingsState } from "./actions";

type Theme = "light" | "dark" | "system";

export function ThemeCard() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // localStorage is only readable after hydration; reading it during render would mismatch the server HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme((localStorage.getItem("theme") as Theme | null) ?? "dark");
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    localStorage.setItem("theme", next);
    const dark = next === "dark" || (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }

  const options: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how Lucenta looks on this device.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        {options.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => apply(id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm cursor-pointer",
              theme === id ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted",
            )}
          >
            <Icon className="h-5 w-5" /> {label}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

export function AboutYouForm({ defaults, lockedUntil }: { defaults: AboutYouValues; lockedUntil: string | null }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateAboutYou, {});

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>About you</CardTitle>
        <CardDescription>Your occupation decides which tools are available. Keep it accurate.</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent>
          <AboutYouFields defaults={defaults} errors={state.fieldErrors} occupationLockedUntil={lockedUntil} />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" loading={pending}>
            Save details
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function PreferencesForm({ saveHistory, emailNotifications }: { saveHistory: boolean; emailNotifications: boolean }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updatePreferences, {});

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy & notifications</CardTitle>
        <CardDescription>Control what we store and when we email you.</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-5">
          <Switch
            name="save_history"
            defaultChecked={saveHistory}
            label="Save text history"
            description="Keep your AI detections, writing suggestions and rewrites so you can revisit them. When off, text is not stored."
          />
          <Switch
            name="email_notifications"
            defaultChecked={emailNotifications}
            label="Email notifications"
            description="Product updates and alerts when a monitored website's score drops."
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" loading={pending}>
            Save preferences
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
