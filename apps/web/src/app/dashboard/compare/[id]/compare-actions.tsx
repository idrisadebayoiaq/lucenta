"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CompareActions({ comparisonId, urls, device }: { comparisonId: string; urls: string[]; device: string }) {
  const router = useRouter();
  const [rerunning, setRerunning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function rerun() {
    const [url, ...competitors] = urls;
    setRerunning(true);
    toast.info("Re-scanning every site. This usually takes under a minute.");
    try {
      const res = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, competitors, device, fresh: true }),
      });
      const data = await res.json();
      if (data.comparisonId) {
        for (const f of data.failed ?? []) toast.error(`Couldn't analyze ${f.url}: ${f.message}`);
        router.push(`/dashboard/compare/${data.comparisonId}`);
        router.refresh();
        return;
      }
      toast.error(data.error?.message ?? "Re-run failed.");
    } catch {
      toast.error("Network error. Please try again.");
    }
    setRerunning(false);
  }

  async function remove() {
    if (!window.confirm("Delete this comparison? The individual website reports stay in your Website Analyzer history.")) return;
    setDeleting(true);
    const res = await fetch(`/api/comparisons/${comparisonId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast.success("Comparison deleted.");
      router.push("/dashboard/compare");
      router.refresh();
    } else toast.error("Could not delete the comparison.");
  }

  return (
    <>
      <Button variant="outline" onClick={rerun} loading={rerunning}>
        {!rerunning && <RefreshCw className="h-4 w-4" />} {rerunning ? "Re-running…" : "Re-run"}
      </Button>
      <Button variant="ghost" onClick={remove} loading={deleting} aria-label="Delete comparison">
        {!deleting && <Trash2 className="h-4 w-4" />}
      </Button>
    </>
  );
}
