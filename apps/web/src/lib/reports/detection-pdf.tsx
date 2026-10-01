import "server-only";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { DetectionResult, SentenceScore } from "@/lib/detector/types";
import { Badge, Bar, BrandLine, C, Chip, PageChrome, Section, clean, formatPdfDate, s, type PdfBrand, type Tone } from "./pdf-kit";

const LABEL: Record<DetectionResult["label"], { text: string; tone: Tone; color: string }> = {
  likely_human: { text: "Likely human-written", tone: "success", color: C.green },
  mixed: { text: "Mixed / uncertain", tone: "warning", color: C.amber },
  likely_ai: { text: "Likely AI-generated", tone: "danger", color: C.red },
};

const pct = (p: number) => `${Math.round(p * 100)}%`;
const highlight = (ai: number) => (ai >= 0.7 ? "#ffe4e8" : ai >= 0.4 ? "#fef3c7" : undefined);

export type DetectionPdfInput = { title: string; text: string; result: DetectionResult; createdAt: string };

function Highlighted({ text, sentences, start, end }: { text: string; sentences: SentenceScore[]; start: number; end: number }) {
  const inRange = sentences.filter((x) => x.start >= start && x.end <= end);
  const parts: { text: string; bg?: string }[] = [];
  let cursor = start;
  for (const x of inRange) {
    if (x.start > cursor) parts.push({ text: text.slice(cursor, x.start) });
    parts.push({ text: text.slice(x.start, x.end), bg: highlight(x.ai) });
    cursor = x.end;
  }
  if (cursor < end) parts.push({ text: text.slice(cursor, end) });
  return (
    <Text style={{ fontSize: 9.5, lineHeight: 1.7, color: C.body }}>
      {parts.map((p, i) => (
        <Text key={i} style={p.bg ? { backgroundColor: p.bg } : undefined}>
          {clean(p.text)}
        </Text>
      ))}
    </Text>
  );
}

function DetectionDocument({ input, brand }: { input: DetectionPdfInput; brand: PdfBrand }) {
  const { result, text } = input;
  const doc = result.document;
  const label = LABEL[result.label];
  const title = clean(input.title) || "Untitled text";
  const flagged = result.sentences.filter((x) => x.ai >= 0.7).length;
  const signals: [string, string][] = [
    ["Burstiness", String(result.signals.burstiness)],
    ["Avg. sentence", `${result.signals.avgSentenceLength} words`],
    ["Lexical diversity", String(result.signals.lexicalDiversity)],
    ["AI phrases", String(result.signals.aiPhraseCount)],
  ];

  return (
    <Document title={`AI detection · ${title}`} author={brand.whiteLabel ? clean(brand.name) : "Lucenta"} creator="Lucenta" producer="Lucenta">
      <Page size="A4" style={s.page}>
        <View style={[s.hero, s.row, { alignItems: "center", gap: 18 }]}>
          <View style={{ flex: 1 }}>
            <View style={[s.row, { justifyContent: "space-between", alignItems: "center", marginBottom: 14 }]}>
              <BrandLine brand={brand} inverted size={15} />
              <Text style={{ fontSize: 7.5, color: C.heroMuted, letterSpacing: 1 }}>AI DETECTION REPORT</Text>
            </View>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 20, color: "#ffffff", lineHeight: 1.2 }}>{title}</Text>
            <View style={[s.row, { gap: 5, marginTop: 10, flexWrap: "wrap" }]}>
              <Chip dark>{formatPdfDate(input.createdAt)}</Chip>
              <Chip dark>{result.wordCount.toLocaleString()} words</Chip>
              {doc && <Chip dark>{doc.parts.length} parts</Chip>}
              <Chip dark>{result.engine === "ml" ? "ML detector" : "Statistical detector"}</Chip>
            </View>
          </View>
          <View style={{ alignItems: "center", width: 118 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 40, color: label.color, lineHeight: 1 }}>{pct(result.aiProbability)}</Text>
            <Text style={{ fontSize: 9, color: C.heroMuted, marginTop: 4 }}>AI probability</Text>
          </View>
        </View>

        <View style={[s.card, { marginTop: 12 }]}>
          <View style={[s.row, { alignItems: "center", gap: 6 }]}>
            <Text style={[s.bold, { fontSize: 12, color: C.ink }]}>{label.text}</Text>
            <Badge label={`${result.confidence} confidence`} tone="outline" />
          </View>
          <Text style={[s.muted, { marginTop: 3 }]}>
            {flagged === 0
              ? "No sentences were flagged as likely AI."
              : `${flagged} of ${result.sentences.length} sentences look likely AI-written. They're highlighted in the text below.`}{" "}
            A detection score is a probability, not proof. Use it as one signal alongside your own judgement.
          </Text>
        </View>

        {doc && (
          <Section title="Parts" subtitle={`The document was checked in ${doc.parts.length} parts of up to 3,000 characters each.`} keepTogether>
            <View style={s.card}>
              {doc.parts.map((p, i) => (
                <View key={p.start} style={[s.row, { alignItems: "center", gap: 10, paddingVertical: 4, borderTopWidth: i ? 0.75 : 0, borderColor: C.border }]}>
                  <Text style={[s.bold, { width: 44, color: C.ink }]}>Part {i + 1}</Text>
                  <Text style={[s.small, { width: 62 }]}>{p.wordCount} words</Text>
                  <View style={{ flex: 1 }}>
                    <Bar value={p.aiProbability * 100} color={LABEL[p.label].color} height={5} />
                  </View>
                  <Text style={[s.bold, { width: 32, textAlign: "right", color: C.ink }]}>{pct(p.aiProbability)}</Text>
                  <View style={{ width: 92, alignItems: "flex-end" }}>
                    <Badge label={LABEL[p.label].text} tone={LABEL[p.label].tone} />
                  </View>
                </View>
              ))}
              {doc.totalParts > doc.parts.length && (
                <Text style={[s.small, { marginTop: 6 }]}>
                  Only the first {doc.parts.length} of {doc.totalParts} parts were checked. The rest of the document isn&apos;t included in this report.
                </Text>
              )}
            </View>
          </Section>
        )}

        <Section title="Why this score?" keepTogether>
          <View style={s.card}>
            {result.explanation.map((e) => (
              <View key={e} style={[s.row, { gap: 5, marginTop: 2 }]}>
                <Text style={{ color: C.muted }}>•</Text>
                <Text style={{ flex: 1 }}>{clean(e)}</Text>
              </View>
            ))}
            <View style={[s.row, { gap: 6, marginTop: 10 }]}>
              {signals.map(([k, v]) => (
                <View key={k} style={{ flex: 1, borderWidth: 1.5, borderColor: C.ink, padding: 7 }}>
                  <Text style={s.small}>{k}</Text>
                  <Text style={[s.bold, { color: C.ink, fontSize: 11, marginTop: 1 }]}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        </Section>

        <Section title="Highlighted text" subtitle="Red: likely AI. Amber: possibly AI.">
          {doc ? (
            doc.parts.map((p, i) => (
              <View key={p.start} style={{ marginBottom: 10 }}>
                <View minPresenceAhead={40} style={[s.row, { gap: 6, alignItems: "center", marginBottom: 4 }]}>
                  <Text style={[s.bold, { color: C.ink }]}>Part {i + 1}</Text>
                  <Badge label={`${pct(p.aiProbability)} AI`} tone={LABEL[p.label].tone} />
                </View>
                <Highlighted text={text} sentences={result.sentences} start={p.start} end={p.end} />
              </View>
            ))
          ) : (
            <Highlighted text={text} sentences={result.sentences} start={0} end={text.length} />
          )}
        </Section>
        <PageChrome brand={brand} title={`AI detection · ${title}`} />
      </Page>
    </Document>
  );
}

export function renderDetectionPdf(input: DetectionPdfInput, brand: PdfBrand) {
  return renderToBuffer(<DetectionDocument input={input} brand={brand} />);
}

export function detectionPdfFileName(title: string) {
  const base = title.replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9.-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "text";
  return `${base}-ai-detection.pdf`;
}
