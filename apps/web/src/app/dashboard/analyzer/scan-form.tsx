"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Globe, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

const STAGES = [
  "Resolving the address",
  "Downloading the page",
  "Checking performance",
  "Checking SEO tags",
  "Looking for robots.txt and sitemap",
  "Testing links",
  "Checking security headers",
  "Checking accessibility",
  "Reviewing content",
  "Calculating scores",
];

export function ScanForm({ initialUrl = "", autoStart = false }: { initialUrl?: string; autoStart?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2500);
    return () => clearInterval(t);
  }, [running]);

  async function run(target: string) {
    if (!target.trim()) return;
    setStage(0);
    setRunning(true);
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target, device }),
      });
      const data = await res.json();
      if (data.scanId) {
        if (data.status === "failed") toast.error(data.error?.message ?? "The scan failed.");
        router.push(`/dashboard/analyzer/${data.scanId}`);
        router.refresh();
        return;
      }
      toast.error(data.error?.message ?? "Something went wrong.");
    } catch {
      toast.error("Network error. Please try again.");
    }
    setRunning(false);
  }

  useEffect(() => {
    if (autoStart && initialUrl && !started.current) {
      started.current = true;
      run(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    run(url);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="example.com"
                disabled={running}
                className="h-12 w-full rounded-lg border bg-card pl-11 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Website URL"
              />
            </div>
            <div className="flex rounded-lg border p-1">
              {(["mobile", "desktop"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  disabled={running}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 text-sm capitalize cursor-pointer",
                    device === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d === "mobile" ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  {d}
                </button>
              ))}
            </div>
            <Button type="submit" size="lg" loading={running}>
              {running ? "Analyzing…" : "Analyze"}
            </Button>
          </div>
          {running && (
            <div className="space-y-2 rounded-lg bg-muted/50 p-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{STAGES[stage]}…</span>
                <span className="text-muted-foreground">This usually takes 10–60 seconds</span>
              </div>
              <Progress value={((stage + 1) / STAGES.length) * 95} />
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
