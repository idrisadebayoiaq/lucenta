"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PenLine, ThumbsDown, ThumbsUp } from "lucide-react";
import { ContactButtons, FreelancerAvatar, FreelancerName } from "@/components/freelancer-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { matchWriters } from "@/lib/freelancer-match";
import type { Freelancer } from "@/lib/freelancers";
import { cn } from "@/lib/utils";

/**
 * "Happy with this result?" prompt under a writing result. If the user isn't, it suggests writers whose
 * specialties match the kind of content they're working on. Never rendered for student accounts.
 */
export function WriterSuggestions({ text, writers, className }: { text: string; writers: Freelancer[]; className?: string }) {
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  const { types, matches } = useMemo(() => matchWriters(text, writers), [text, writers]);
  const topic = types[0]?.specialty === "editing" ? undefined : types[0]?.label;

  if (answer === "yes") {
    return <p className={cn("text-center text-sm text-muted-foreground", className)}>Great, glad it helped.</p>;
  }

  if (answer === null) {
    return (
      <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3", className)}>
        <p className="text-sm font-medium">Happy with this result?</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAnswer("yes")}>
            <ThumbsUp className="h-4 w-4" /> Yes
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAnswer("no")}>
            <ThumbsDown className="h-4 w-4" /> Not really
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 rounded-2xl border border-primary/40 p-4", className)}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <PenLine className="h-5 w-5" />
        </span>
        <div>
          <p className="font-bold">Work with a professional writer</p>
          <p className="text-sm text-muted-foreground">
            {matches.length ? "Based on what you're writing, these writers could help." : "No writers are listed on Lucenta yet. Check back soon."}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {types.map((t) => (
              <Badge key={t.specialty} tone="outline" title={t.reason}>
                {t.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {matches.length > 0 && (
        <div className="divide-y rounded-xl border">
          {matches.map(({ freelancer, reasons }) => (
            <div key={freelancer.id} className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <FreelancerAvatar freelancer={freelancer} size={44} />
                <FreelancerName freelancer={freelancer} link />
              </div>
              {reasons.length > 0 && (
                <p className="text-sm">
                  <span className="font-semibold">Good fit for: </span>
                  <span className="text-muted-foreground">{reasons.join(", ")}</span>
                </p>
              )}
              <ContactButtons freelancer={freelancer} context={{ topic }} compact />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/freelancers?type=writer" className={buttonVariants({ variant: "link", size: "sm" })}>
          See all writers →
        </Link>
        <Link href="/dashboard/freelancer" className="text-muted-foreground hover:text-foreground hover:underline">
          Are you a writer? Get listed
        </Link>
      </div>
    </div>
  );
}
