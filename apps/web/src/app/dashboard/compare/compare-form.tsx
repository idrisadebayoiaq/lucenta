"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Globe, Monitor, Plus, Smartphone, Swords, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { MAX_COMPETITORS } from "@/lib/analyzer/compare";
import { cn } from "@/lib/utils";

const STAGES = [
  "Resolving the addresses",
  "Downloading every page",
  "Checking performance",
  "Checking SEO tags",
  "Checking security headers",
  "Checking accessibility",
  "Reviewing content",
  "Finding the gaps",
  "Ranking the sites",
];

const inputClass =
  "h-12 w-full rounded-lg border bg-card pl-11 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

export function CompareForm({
  initialUrl = "",
  initialDevice = "mobile",
  scansLeft,
}: {
  initialUrl?: string;
  initialDevice?: "mobile" | "desktop";
  scansLeft: number;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [competitors, setCompetitors] = useState<string[]>([""]);
  const [device, setDevice] = useState(initialDevice);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 3500);
    return () => clearInterval(t);
  }, [running]);

  const filled = competitors.filter((c) => c.trim());
  const sitesCount = 1 + filled.length;

  function setCompetitor(i: number, value: string) {
    setCompetitors((list) => list.map((c, j) => (j === i ? value : c)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return toast.error("Enter your website.");
    if (!filled.length) return toast.error("Add at least one competitor.");
    setStage(0);
    setRunning(true);
    try {
      const res = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, competitors: filled, device }),
      });
      const data = await res.json();
      if (data.comparisonId) {
        for (const f of data.failed ?? []) toast.error(`Couldn't analyze ${f.url}: ${f.message}`);
        router.push(`/dashboard/compare/${data.comparisonId}`);
        router.refresh();
        return;
      }
      toast.error(data.error?.message ?? "Something went wrong.");
    } catch {
      toast.error("Network error. Please try again.");
    }
    setRunning(false);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="compare-url" className="text-sm font-bold">
              Your website
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
              <input
                id="compare-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yoursite.com"
                disabled={running}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold">
              Competitors <span className="font-normal text-muted-foreground">(up to {MAX_COMPETITORS})</span>
            </p>
            {competitors.map((c, i) => (
              <div key={i} className="flex gap-2">
                <div className="relative flex-1">
                  <Swords className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={c}
                    onChange={(e) => setCompetitor(i, e.target.value)}
                    placeholder={`competitor${i + 1}.com`}
                    disabled={running}
                    className={inputClass}
                    aria-label={`Competitor ${i + 1}`}
                  />
                </div>
                {competitors.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12"
                    disabled={running}
                    onClick={() => setCompetitors((list) => list.filter((_, j) => j !== i))}
                    aria-label={`Remove competitor ${i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {competitors.length < MAX_COMPETITORS && (
              <Button type="button" variant="outline" size="sm" disabled={running} onClick={() => setCompetitors((list) => [...list, ""])}>
                <Plus className="h-4 w-4" /> Add competitor
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-fit rounded-lg border p-1">
              {(["mobile", "desktop"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  disabled={running}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm capitalize",
                    device === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d === "mobile" ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  {d}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground">
                Uses up to {sitesCount} of your {scansLeft} audits left today. Sites you already scanned today are free.
              </p>
              <Button type="submit" size="lg" loading={running}>
                {running ? "Comparing…" : "Compare"}
              </Button>
            </div>
          </div>

          {running && (
            <div className="space-y-2 rounded-lg bg-muted/50 p-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{STAGES[stage]}…</span>
                <span className="text-muted-foreground">All sites are scanned at the same time, usually within a minute</span>
              </div>
              <Progress value={((stage + 1) / STAGES.length) * 95} />
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
