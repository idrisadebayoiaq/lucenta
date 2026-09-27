"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bot, Globe, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { aiScoreColor, cn, formatDateTime, scoreColor } from "@/lib/utils";
import { deleteItems } from "./actions";

export type HistoryItem = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  createdAt: string;
  score: { value: number; kind: "website" | "ai" } | null;
  status?: string;
};

export function HistoryList({ items, kind }: { items: HistoryItem[]; kind: "scans" | "text_checks" }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function remove(ids: string[]) {
    if (!window.confirm(`Delete ${ids.length} item${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteItems(kind, ids);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Deleted.");
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={kind === "scans" ? <Globe className="h-8 w-8" /> : <Bot className="h-8 w-8" />}
        title="Nothing here yet"
        description={kind === "scans" ? "Your website scans will appear here." : "Your AI detections, writing suggestions and rewrites will appear here."}
      />
    );
  }

  return (
    <div>
      <div className="mb-2 flex min-h-9 items-center justify-between gap-2 px-1">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--primary)]"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))}
          />
          {selected.size ? `${selected.size} selected` : "Select all"}
        </label>
        {selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => remove([...selected])} loading={pending}>
            <Trash2 className="h-4 w-4" /> Delete selected
          </Button>
        )}
      </div>
      <ul className="divide-y rounded-lg border">
        {items.map((item) => (
          <li key={item.id} className={cn("flex items-center gap-3 px-3 py-3", selected.has(item.id) && "bg-primary/5")}>
            <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={selected.has(item.id)} onChange={() => toggle(item.id)} aria-label="Select" />
            <Link href={item.href} className="min-w-0 flex-1 hover:opacity-80">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.subtitle} · {formatDateTime(item.createdAt)}
              </p>
            </Link>
            {item.score ? (
              <span
                className={cn(
                  "shrink-0 text-sm font-bold",
                  item.score.kind === "website" ? scoreColor(item.score.value) : aiScoreColor(item.score.value / 100),
                )}
              >
                {item.score.value}
                {item.score.kind === "ai" ? "% AI" : ""}
              </span>
            ) : item.status ? (
              <Badge tone={item.status === "failed" ? "danger" : "info"} className="capitalize">
                {item.status}
              </Badge>
            ) : null}
            <Button variant="ghost" size="icon" onClick={() => remove([item.id])} aria-label="Delete" disabled={pending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
