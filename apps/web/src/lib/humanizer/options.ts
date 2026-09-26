export type Tone = "standard" | "casual" | "professional" | "academic" | "creative" | "simple";
export type Strength = "light" | "balanced" | "aggressive";

export const TONES: { id: Tone; label: string }[] = [
  { id: "standard", label: "Standard" },
  { id: "casual", label: "Casual" },
  { id: "professional", label: "Professional" },
  { id: "academic", label: "Academic" },
  { id: "creative", label: "Creative" },
  { id: "simple", label: "Simple" },
];

export const STRENGTHS: { id: Strength; label: string; description: string }[] = [
  { id: "light", label: "Light", description: "Minimal edits" },
  { id: "balanced", label: "Balanced", description: "Recommended" },
  { id: "aggressive", label: "Aggressive", description: "Full rewrite" },
];
