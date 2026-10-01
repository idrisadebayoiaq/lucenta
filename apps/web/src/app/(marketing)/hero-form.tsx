"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    router.push(`/dashboard/analyzer?url=${encodeURIComponent(url.trim())}`);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-xl flex-col gap-2 brutal p-2 sm:flex-row">
      <div className="flex flex-1 items-center gap-2 px-3">
        <Globe className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter your website, e.g. example.com"
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Website URL"
        />
      </div>
      <Button type="submit" size="lg">
        Analyze website
      </Button>
    </form>
  );
}
