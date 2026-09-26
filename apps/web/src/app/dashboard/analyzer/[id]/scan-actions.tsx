"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ScanActions({ scanId, url, device }: { scanId: string; url: string; device: string }) {
  const router = useRouter();
  const [rescanning, setRescanning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function rescan() {
    setRescanning(true);
    const res = await fetch("/api/scans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, device }),
    });
    const data = await res.json();
    setRescanning(false);
    if (data.scanId) {
      if (data.status === "failed") toast.error(data.error?.message);
      router.push(`/dashboard/analyzer/${data.scanId}`);
      router.refresh();
    } else toast.error(data.error?.message ?? "Re-scan failed.");
  }

  async function remove() {
    if (!window.confirm("Delete this scan?")) return;
    setDeleting(true);
    const res = await fetch(`/api/scans/${scanId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast.success("Scan deleted.");
      router.push("/dashboard/analyzer");
      router.refresh();
    } else toast.error("Could not delete the scan.");
  }

  return (
    <>
      <Button variant="outline" onClick={rescan} loading={rescanning}>
        {!rescanning && <RefreshCw className="h-4 w-4" />} Re-scan
      </Button>
      <Button variant="ghost" onClick={remove} loading={deleting} aria-label="Delete scan">
        {!deleting && <Trash2 className="h-4 w-4" />}
      </Button>
    </>
  );
}
