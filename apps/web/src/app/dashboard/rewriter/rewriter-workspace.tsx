"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Lightbulb, Lock, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RewriteTool } from "./rewrite-tool";
import { SuggestionsTool } from "./suggestions-tool";

export type RewriterMode = "suggest" | "rewrite";

/** sessionStorage key used by the AI Detector to hand text over to the Rewriter. */
export const REWRITER_HANDOFF_KEY = "rewriter:text";

const MODES = [
  {
    id: "suggest",
    label: "Suggestions",
    icon: Lightbulb,
    description: "See which sentences sound robotic or unclear, and how to fix them. You make the edits, so the writing stays yours.",
  },
  {
    id: "rewrite",
    label: "Rewrite",
    icon: Wand2,
    description: "Turn stiff, robotic text into natural, human-sounding writing, with your meaning, names and numbers kept.",
  },
] as const;

export function RewriterWorkspace({
  initialMode,
  canRewrite,
  usage,
  configured,
}: {
  initialMode: RewriterMode;
  canRewrite: boolean;
  usage: { used: number; limit: number };
  configured: boolean;
}) {
  const [mode, setMode] = useState<RewriterMode>(canRewrite ? initialMode : "suggest");
  const [text, setText] = useState("");

  useEffect(() => {
    const incoming = sessionStorage.getItem(REWRITER_HANDOFF_KEY);
    if (incoming) {
      // sessionStorage is only readable after hydration, so this can't be a lazy initial state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(incoming);
      sessionStorage.removeItem(REWRITER_HANDOFF_KEY);
    }
  }, []);

  function switchMode(next: RewriterMode) {
    if (next === "rewrite" && !canRewrite) return;
    setMode(next);
    window.history.replaceState(null, "", `?mode=${next}`);
  }

  const current = MODES.find((m) => m.id === mode)!;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div role="tablist" aria-label="Rewriter mode" className="inline-flex rounded-full border p-1">
          {MODES.map(({ id, label, icon: Icon }) => {
            const locked = id === "rewrite" && !canRewrite;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                disabled={locked}
                title={locked ? "Not available on student accounts" : undefined}
                onClick={() => switchMode(id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
                  mode === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  locked ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                )}
              >
                {locked ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">{current.description}</p>
        {!canRewrite && (
          <div className="flex items-start gap-3 rounded-2xl border bg-primary/5 px-4 py-3 text-sm">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              <span className="font-bold text-foreground">Student account.</span> To support academic integrity, Rewrite mode
              isn&apos;t available to students. Suggestions show you exactly what to improve, so you can make your own writing
              stronger.
            </p>
          </div>
        )}
      </div>

      {mode === "suggest" ? (
        <SuggestionsTool text={text} setText={setText} usage={usage} isStudent={!canRewrite} />
      ) : (
        <RewriteTool text={text} setText={setText} usage={usage} configured={configured} />
      )}
    </div>
  );
}
