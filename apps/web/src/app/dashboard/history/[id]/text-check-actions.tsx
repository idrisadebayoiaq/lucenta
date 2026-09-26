"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Copy, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteItems, renameTextCheck } from "../actions";

export function EditableTitle({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await renameTextCheck(id, value);
      if (res.error) toast.error(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (!editing) {
    return (
      <h1 className="flex min-w-0 items-center gap-2 text-2xl font-bold tracking-tight">
        <span className="truncate">{title}</span>
        <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground cursor-pointer" aria-label="Rename">
          <Pencil className="h-4 w-4" />
        </button>
      </h1>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input value={value} onChange={(e) => setValue(e.target.value)} maxLength={120} className="max-w-md" autoFocus />
      <Button size="icon" onClick={save} loading={pending} aria-label="Save">
        {!pending && <Check className="h-4 w-4" />}
      </Button>
      <Button size="icon" variant="ghost" onClick={() => setEditing(false)} aria-label="Cancel">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TextCheckActions({ id, output }: { id: string; output: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function remove() {
    if (!window.confirm("Delete this check?")) return;
    start(async () => {
      const res = await deleteItems("text_checks", [id]);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Deleted.");
        router.push("/dashboard/history?tab=texts");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex gap-2">
      {output && (
        <Button
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(output);
            toast.success("Copied to clipboard.");
          }}
        >
          <Copy className="h-4 w-4" /> Copy result
        </Button>
      )}
      <Button variant="ghost" onClick={remove} loading={pending} aria-label="Delete">
        {!pending && <Trash2 className="h-4 w-4" />}
      </Button>
    </div>
  );
}
