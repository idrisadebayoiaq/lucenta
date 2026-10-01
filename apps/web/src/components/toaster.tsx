"use client";

import { useSyncExternalStore } from "react";
import { Toaster as Sonner } from "sonner";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

export function Toaster() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <Sonner
      position="top-right"
      theme={dark ? "dark" : "light"}
      toastOptions={{
        classNames: {
          toast:
            "rounded-none! border-2! border-ink! bg-card! text-foreground! shadow-brutal-sm! font-sans! gap-3! px-4! py-3.5!",
          title: "font-bold! text-sm!",
          description: "text-muted-foreground! text-[13px]!",
          success: "border-l-8! border-l-emerald-500! [&_[data-icon]]:text-emerald-500",
          error: "border-l-8! border-l-red-500! [&_[data-icon]]:text-red-500",
          warning: "border-l-8! border-l-amber-500! [&_[data-icon]]:text-amber-500",
          info: "border-l-8! border-l-primary! [&_[data-icon]]:text-primary",
          actionButton: "rounded-none! bg-primary! font-bold!",
          closeButton: "rounded-none! border-2! border-ink!",
        },
      }}
    />
  );
}
