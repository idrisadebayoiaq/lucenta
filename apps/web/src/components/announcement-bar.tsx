"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ArrowRight, X } from "lucide-react";
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
    <div className="relative z-50 border-b-4 border-[#1d6bff] bg-[#0b0b0f] text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2.5 py-2.5 pl-4 pr-11 text-[13px] sm:text-sm">
        <p className="flex items-center gap-2.5 text-left font-semibold leading-snug sm:text-center">
          <span className="shrink-0 bg-[#1d6bff] px-1.5 py-0.5 text-[10px] font-extrabold uppercase leading-none tracking-[0.14em]">
            New
          </span>
          {ANNOUNCEMENT.message}
        </p>
        <Link
          href={ANNOUNCEMENT.cta.href}
          className="inline-flex shrink-0 items-center gap-1.5 border-2 border-white bg-white px-3 py-1 text-xs font-extrabold uppercase leading-none tracking-wider text-[#0b0b0f] shadow-[3px_3px_0_0_#1d6bff] transition-[transform,box-shadow] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_#1d6bff]"
        >
          {ANNOUNCEMENT.cta.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-2 grid h-7 w-7 cursor-pointer place-items-center border border-white/25 hover:bg-white/15"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
