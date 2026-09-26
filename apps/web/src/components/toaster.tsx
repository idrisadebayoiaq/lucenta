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
  return <Sonner richColors position="top-right" theme={dark ? "dark" : "light"} />;
}
