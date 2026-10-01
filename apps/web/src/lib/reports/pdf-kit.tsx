import "server-only";
import { Circle, Link, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { CheckStatus, Effort, Impact } from "@/lib/analyzer/types";
import { SITE_HOST } from "@/lib/site";

/** White-label documents replace every mention of Lucenta with the agency's name. */
export type PdfBrand = { whiteLabel: false } | { whiteLabel: true; name: string };

export const C = {
  ink: "#0b0b0f",
  body: "#262a33",
  muted: "#5b6070",
  faint: "#8a8f9c",
  border: "#d3d7e0",
  soft: "#eef0f4",
  track: "#e4e7ee",
  primary: "#1d6bff",
  primarySoft: "#e3ecff",
  heroMuted: "#9ba1af",
  heroTrack: "#2d3039",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#f43f5e",
  sky: "#0ea5e9",
};

export type Tone = "danger" | "warning" | "success" | "info" | "primary" | "outline";
const TONES: Record<Tone, { bg: string; fg: string; border?: string }> = {
  danger: { bg: "#ffe4e8", fg: "#e11d48" },
  warning: { bg: "#fef3c7", fg: "#b45309" },
  success: { bg: "#d1fae5", fg: "#047857" },
  info: { bg: "#e0f2fe", fg: "#0369a1" },
  primary: { bg: C.primarySoft, fg: C.primary },
  outline: { bg: "#ffffff", fg: C.ink, border: C.ink },
};

export const IMPACT_TONE: Record<Impact, Tone> = { high: "danger", medium: "warning", low: "info" };
export const EFFORT_TONE: Record<Effort, Tone> = { easy: "success", medium: "warning", hard: "danger" };
export const IMPACT_COLOR: Record<Impact, string> = { high: C.red, medium: C.amber, low: C.sky };

/** Same thresholds as the web app (`scoreColor` in lib/utils). */
export const scoreColor = (score: number) => (score >= 90 ? C.green : score >= 65 ? C.amber : C.red);

// The built-in PDF fonts only cover Windows-1252; anything else would print as garbage.
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const REPLACEMENTS: Record<string, string> = { "→": "->", "←": "<-", "≥": ">=", "≤": "<=", "✓": "", "✔": "", "✗": "x", "\u00a0": " " };
export function clean(value: string | null | undefined) {
  if (!value) return "";
  return Array.from(value, (ch) => {
    if (ch in REPLACEMENTS) return REPLACEMENTS[ch];
    const code = ch.codePointAt(0)!;
    return code <= 0xff || WIN_ANSI_EXTRA.has(ch) ? ch : "";
  }).join("");
}

export const s = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 54, paddingHorizontal: 36, fontFamily: "Helvetica", fontSize: 9.5, color: C.body, lineHeight: 1.45 },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: C.muted },
  small: { fontSize: 8, color: C.muted },
  row: { flexDirection: "row" },
  card: { borderWidth: 1.5, borderColor: C.ink, padding: 12, backgroundColor: "#ffffff" },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 12.5, color: C.ink, textTransform: "uppercase", letterSpacing: 0.4 },
  sectionSub: { fontSize: 8.5, color: C.muted, marginTop: 5 },
  hero: { backgroundColor: C.ink, padding: 20, color: "#ffffff", borderBottomWidth: 5, borderBottomColor: C.primary },
});

/** `keepTogether` moves the whole section to the next page instead of splitting it. */
export function Section({
  title,
  subtitle,
  children,
  first,
  keepTogether,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  first?: boolean;
  keepTogether?: boolean;
}) {
  return (
    <View style={{ marginTop: first ? 0 : 20 }} wrap={!keepTogether}>
      <View minPresenceAhead={60} style={{ marginBottom: 8 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        <View style={{ width: 28, height: 3, backgroundColor: C.primary, marginTop: 4 }} />
        {subtitle && <Text style={s.sectionSub}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  const t = TONES[tone];
  return (
    <Text
      style={{
        backgroundColor: t.bg,
        color: t.fg,
        borderWidth: t.border ? 0.75 : 0,
        borderColor: t.border ?? t.bg,
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {label}
    </Text>
  );
}

export function Bar({ value, color, height = 4 }: { value: number; color: string; height?: number }) {
  return (
    <View style={{ height, backgroundColor: C.track }}>
      <View style={{ height, width: `${Math.max(2, Math.min(100, value))}%`, backgroundColor: color }} />
    </View>
  );
}

export function ScoreRing({
  score,
  size,
  label,
  dark,
}: {
  score: number;
  size: number;
  label?: string;
  dark?: boolean;
}) {
  const stroke = Math.max(3, size * 0.085);
  const r = (size - stroke) / 2;
  const c = size / 2;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const angle = pct * 2 * Math.PI;
  const end = { x: c + r * Math.sin(angle), y: c - r * Math.cos(angle) };
  const color = scoreColor(score);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
        <Circle cx={c} cy={c} r={r} stroke={dark ? C.heroTrack : C.track} strokeWidth={stroke} fill="none" />
        {pct >= 1 ? (
          <Circle cx={c} cy={c} r={r} stroke={color} strokeWidth={stroke} fill="none" />
        ) : pct > 0 ? (
          <Path
            d={`M ${c} ${c - r} A ${r} ${r} 0 ${angle > Math.PI ? 1 : 0} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
          />
        ) : null}
      </Svg>
      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: size * 0.3, color: dark ? "#ffffff" : C.ink, lineHeight: 1 }}>{Math.round(score)}</Text>
      {label && <Text style={{ fontSize: Math.max(6.5, size * 0.1), color: dark ? C.heroMuted : C.muted, marginTop: 2 }}>{label}</Text>}
    </View>
  );
}

const STATUS_COLOR: Record<CheckStatus, string> = { pass: C.green, warn: C.amber, fail: C.red, info: C.sky };

export function StatusIcon({ status, size = 11 }: { status: CheckStatus; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Circle cx={6} cy={6} r={6} fill={STATUS_COLOR[status]} />
      {status === "pass" && <Path d="M3.4 6.1 L5.2 7.8 L8.6 4.3" stroke="#ffffff" strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      {status === "fail" && <Path d="M4.1 4.1 L7.9 7.9 M7.9 4.1 L4.1 7.9" stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" />}
      {status === "warn" && (
        <>
          <Path d="M6 3.1 L6 6.7" stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" />
          <Circle cx={6} cy={8.7} r={0.8} fill="#ffffff" />
        </>
      )}
      {status === "info" && (
        <>
          <Path d="M6 5.4 L6 8.9" stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" />
          <Circle cx={6} cy={3.5} r={0.8} fill="#ffffff" />
        </>
      )}
    </Svg>
  );
}

export function LucentaMark({ size = 18, inverted }: { size?: number; inverted?: boolean }) {
  const edge = inverted ? "#ffffff" : C.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={3} width={21} height={21} fill={edge} />
      <Rect x={0.75} y={0.75} width={20.5} height={20.5} fill={C.primary} stroke={edge} strokeWidth={1.5} />
      <Circle cx={10} cy={10} r={4.2} stroke="#ffffff" strokeWidth={2.3} fill="none" />
      <Path d="M13.2 13.2 L16.8 16.8" stroke="#ffffff" strokeWidth={2.6} />
    </Svg>
  );
}

export function BrandLine({ brand, inverted, size = 16 }: { brand: PdfBrand; inverted?: boolean; size?: number }) {
  return (
    <View style={[s.row, { alignItems: "center", gap: 6 }]}>
      {!brand.whiteLabel && <LucentaMark size={size} inverted={inverted} />}
      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: size * 0.72, color: inverted ? "#ffffff" : C.ink }}>
        {brand.whiteLabel ? clean(brand.name) : "Lucenta"}
        {!brand.whiteLabel && <Text style={{ color: C.primary }}>.</Text>}
      </Text>
    </View>
  );
}

/** Running header (from page 2) and footer with page numbers. Place it last inside <Page>. */
export function PageChrome({ brand, title, onlineUrl }: { brand: PdfBrand; title: string; onlineUrl?: string }) {
  const brandName = brand.whiteLabel ? clean(brand.name) : "Lucenta";
  return (
    <>
      <View fixed style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, backgroundColor: C.primary }} />
      <Text
        fixed
        style={{ position: "absolute", top: 20, left: 36, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.ink, textTransform: "uppercase", letterSpacing: 0.6 }}
        render={({ pageNumber }) => (pageNumber > 1 ? brandName : "")}
      />
      <Text
        fixed
        style={{ position: "absolute", top: 21, right: 36, fontSize: 8, color: C.muted }}
        render={({ pageNumber }) => (pageNumber > 1 ? clean(title) : "")}
      />
      <View fixed style={{ position: "absolute", bottom: 32, left: 36, right: 36, borderTopWidth: 1.5, borderColor: C.ink }} />
      <Text fixed style={{ position: "absolute", bottom: 18, left: 36, fontSize: 8, color: C.muted }}>
        {brand.whiteLabel ? `Prepared by ${brandName}` : `Generated with Lucenta · ${SITE_HOST}`}
      </Text>
      {onlineUrl && (
        <Link
          fixed
          src={onlineUrl}
          style={{ position: "absolute", bottom: 18, left: 237.64, width: 120, textAlign: "center", fontSize: 8, color: C.primary, textDecoration: "none" }}
        >
          View online
        </Link>
      )}
      <Text
        fixed
        style={{ position: "absolute", top: 813, right: 36, width: 100, textAlign: "right", fontSize: 8, color: C.muted }}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </>
  );
}

export function Chip({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <Text
      style={{
        fontSize: 8,
        color: dark ? "#d6dde3" : C.muted,
        borderWidth: 0.75,
        borderColor: dark ? "#3e4851" : C.ink,
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}
    >
      {children}
    </Text>
  );
}

export function formatPdfDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(value));
}
