import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex w-fit items-center gap-2 font-black tracking-tight", className)}>
      <span className="grid h-8 w-8 place-items-center border-2 border-ink bg-primary text-white shadow-brutal-xs">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
          <circle cx="11" cy="11" r="6" />
          <path d="M20 20l-4.5-4.5" />
        </svg>
      </span>
      <span className="text-xl">
        Lucenta<span className="text-primary">.</span>
      </span>
    </Link>
  );
}
