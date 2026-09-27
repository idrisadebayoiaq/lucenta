"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Sparkles, X } from "lucide-react";
import { ANNOUNCEMENT, isAnnouncementActive } from "@/lib/announcements";

const EVENT = "lucenta:announcement";
const storageKey = (id: string) => `announcement-dismissed:${id}`;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function getSnapshot() {
  if (!ANNOUNCEMENT || !isAnnouncementActive(ANNOUNCEMENT)) return false;
  return localStorage.getItem(storageKey(ANNOUNCEMENT.id)) !== "1";
}

export function AnnouncementBar() {
  const pathname = usePathname();
  const visible = useSyncExternalStore(subscribe, getSnapshot, () => false);
  if (!visible || !ANNOUNCEMENT || pathname.startsWith(ANNOUNCEMENT.cta.href)) return null;

  function dismiss() {
    localStorage.setItem(storageKey(ANNOUNCEMENT!.id), "1");
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <div className="relative z-50 bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-x-4 gap-y-2 px-10 py-2 text-sm max-sm:flex-col">
        <p className="flex items-center gap-2 text-center font-medium">
          <Sparkles className="h-4 w-4 shrink-0" />
          {ANNOUNCEMENT.message}
        </p>
        <Link
          href={ANNOUNCEMENT.cta.href}
          className="shrink-0 rounded-full bg-white px-3.5 py-1 text-sm font-bold text-black transition-opacity hover:opacity-90"
        >
          {ANNOUNCEMENT.cta.label}
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full hover:bg-white/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
