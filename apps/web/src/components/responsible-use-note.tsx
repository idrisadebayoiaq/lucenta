import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const NOTES = {
  detector:
    "Scores are estimates based on writing patterns, not proof of who wrote something. Human writing, especially formal text or writing by non-native speakers, can be flagged. Never use a score as the only evidence against anyone.",
  rewriter:
    "Use the Rewriter to improve writing you're allowed to polish. Don't use it to submit work where AI help isn't permitted, to hide AI use where disclosure is required, or to pass off someone else's work as your own.",
};

export function ResponsibleUseNote({ tool }: { tool: keyof typeof NOTES }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p>
        {NOTES[tool]}{" "}
        <Link href="/responsible-use" className="font-bold text-primary hover:underline">
          Responsible use
        </Link>
      </p>
    </div>
  );
}
