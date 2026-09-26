import { detectHeuristic } from "./heuristic";
import type { DetectionResult } from "./types";

/** Uses the ML service when ML_SERVICE_URL is configured, otherwise the built-in heuristic detector. */
export async function detectText(text: string): Promise<DetectionResult> {
  const url = process.env.ML_SERVICE_URL;
  if (url) {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/detect`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-key": process.env.ML_SERVICE_INTERNAL_KEY ?? "" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) return { ...(await res.json()), engine: "ml" } as DetectionResult;
    } catch {
      // Fall back to the heuristic detector.
    }
  }
  return detectHeuristic(text);
}
