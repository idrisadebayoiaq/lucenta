import "server-only";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { displayUrl } from "@/lib/analyzer/compare";
import { CATEGORY_LABELS, type Category, type Report } from "@/lib/analyzer/types";
import { formatKb } from "@/lib/comparisons/data";
import {
  Badge,
  Bar,
  BrandLine,
  C,
  Chip,
  EFFORT_TONE,
  IMPACT_COLOR,
  IMPACT_TONE,
  PageChrome,
  ScoreRing,
  Section,
  StatusIcon,
  clean,
  formatPdfDate,
  s,
  scoreColor,
  type PdfBrand,
  type Tone,
} from "./pdf-kit";

export type { PdfBrand };

/** Same thresholds as the report page. */
function ttfbRating(ms: number): { label: string; tone: Tone } {
  return ms <= 800 ? { label: "Good", tone: "success" } : ms <= 1800 ? { label: "Needs work", tone: "warning" } : { label: "Poor", tone: "danger" };
}

function ReportDocument({ report, brand, createdAt, onlineUrl }: { report: Report; brand: PdfBrand; createdAt: string; onlineUrl?: string }) {
  const categories = Object.keys(CATEGORY_LABELS) as Category[];
  const site = clean(displayUrl(report.finalUrl || report.url));
  const allChecks = categories.flatMap((c) => report.categories[c].checks).filter((c) => c.status !== "info");
  const passed = allChecks.filter((c) => c.status === "pass").length;
  const high = report.recommendations.filter((r) => r.impact === "high").length;
  const m = report.metrics;
  const ttfb = ttfbRating(m.ttfbMs);
  const tiles: { label: string; value: string; rating?: { label: string; tone: Tone } }[] = [
    { label: "Server response (TTFB)", value: `${m.ttfbMs} ms`, rating: ttfb },
    ...(m.pageWeightKb != null ? [{ label: "Page weight", value: formatKb(m.pageWeightKb) }] : []),
    ...(m.requests != null ? [{ label: "Requests", value: String(m.requests) }] : []),
    { label: "HTML size", value: `${m.htmlKb} KB` },
    { label: "Redirects", value: String(m.redirects) },
    { label: "Words on page", value: String(report.page.wordCount) },
  ];
  const title = `Website report · ${site}`;

  return (
    <Document title={`Website report: ${site}`} author={brand.whiteLabel ? clean(brand.name) : "Lucenta"} creator="Lucenta" producer="Lucenta">
      <Page size="A4" style={s.page}>
        <View style={[s.hero, s.row, { alignItems: "center", gap: 18 }]}>
          <View style={{ flex: 1 }}>
            <View style={[s.row, { justifyContent: "space-between", alignItems: "center", marginBottom: 14 }]}>
              <BrandLine brand={brand} inverted size={15} />
              <Text style={{ fontSize: 7.5, color: C.heroMuted, letterSpacing: 1 }}>WEBSITE REPORT</Text>
            </View>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 22, color: "#ffffff", lineHeight: 1.15 }}>{site}</Text>
            {report.page.title && <Text style={{ fontSize: 9.5, color: C.heroMuted, marginTop: 4 }}>{clean(report.page.title)}</Text>}
            <View style={[s.row, { gap: 5, marginTop: 10, flexWrap: "wrap" }]}>
              <Chip dark>{formatPdfDate(createdAt)}</Chip>
              <Chip dark>{report.device === "desktop" ? "Desktop" : "Mobile"} audit</Chip>
              <Chip dark>{allChecks.length} checks</Chip>
            </View>
          </View>
          <View style={{ alignItems: "center" }}>
            <ScoreRing score={report.overall.score} size={104} label={`Grade ${report.overall.grade}`} dark />
            <Text style={{ fontSize: 8, color: C.heroMuted, marginTop: 5 }}>Overall score</Text>
          </View>
        </View>

        <View style={[s.row, { flexWrap: "wrap", gap: 8, marginTop: 12 }]}>
          {categories.map((c) => {
            const score = report.categories[c].score;
            return (
              <View key={c} style={[s.card, { width: "23.8%", padding: 10 }]}>
                <Text style={s.small}>{CATEGORY_LABELS[c]}</Text>
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 18, lineHeight: 1.2, color: scoreColor(score), marginTop: 2, marginBottom: 6 }}>{score}</Text>
                <Bar value={score} color={scoreColor(score)} />
              </View>
            );
          })}
          <View style={[s.card, { width: "23.8%", padding: 10, backgroundColor: C.soft }]}>
            <Text style={s.small}>Checks passed</Text>
            <View style={[s.row, { alignItems: "flex-end", marginTop: 2 }]}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 18, lineHeight: 1.2, color: C.ink }}>{passed}</Text>
              <Text style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}> / {allChecks.length}</Text>
            </View>
            <Text style={[s.small, { marginTop: 1 }]}>
              {report.recommendations.length} fixes · {high} high impact
            </Text>
          </View>
        </View>

        {report.summary && (
          <View wrap={false} style={[s.card, { marginTop: 12, borderLeftWidth: 3, borderLeftColor: C.primary }]}>
            <Text style={[s.bold, { fontSize: 11, color: C.ink }]}>AI review</Text>
            {report.ai?.audience && <Text style={[s.small, { marginTop: 1 }]}>Audience: {clean(report.ai.audience)}</Text>}
            <Text style={{ marginTop: 5, color: C.body }}>{clean(report.summary)}</Text>
            {!!report.ai?.strengths.length && (
              <View style={{ marginTop: 8 }}>
                <Text style={[s.bold, { fontSize: 9, color: C.ink, marginBottom: 3 }]}>What&apos;s working</Text>
                {report.ai.strengths.map((st) => (
                  <View key={st} style={[s.row, { gap: 6, marginTop: 2, alignItems: "flex-start" }]}>
                    <View style={{ marginTop: 1.5 }}>
                      <StatusIcon status="pass" size={9} />
                    </View>
                    <Text style={{ flex: 1 }}>{clean(st)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <Section
          title="Fix these first"
          subtitle={
            report.recommendations.length
              ? `${report.recommendations.length} recommendations, ordered by impact and effort${report.recommendations.some((r) => r.source === "ai") ? ", including issues spotted by the AI review" : ""}.`
              : undefined
          }
        >
          {report.recommendations.length === 0 && (
            <View style={[s.card, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}>
              <Text style={[s.bold, { color: "#047857" }]}>Great job! No major issues found.</Text>
            </View>
          )}
          {report.recommendations.map((rec, i) => (
            <View key={rec.id} wrap={false} style={[s.card, { marginBottom: 7, borderLeftWidth: 3, borderLeftColor: IMPACT_COLOR[rec.impact] }]}>
              <View style={[s.row, { gap: 8, alignItems: "flex-start" }]}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.track, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink, lineHeight: 1 }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.bold, { fontSize: 10.5, color: C.ink }]}>{clean(rec.title)}</Text>
                  <View style={[s.row, { gap: 4, marginTop: 4, flexWrap: "wrap" }]}>
                    {rec.source === "ai" && <Badge label="AI insight" tone="primary" />}
                    <Badge label={`${rec.impact} impact`} tone={IMPACT_TONE[rec.impact]} />
                    <Badge label={`${rec.effort} fix`} tone={EFFORT_TONE[rec.effort]} />
                    <Badge label={CATEGORY_LABELS[rec.category]} tone="outline" />
                  </View>
                  <Text style={{ marginTop: 6, color: C.muted }}>{clean(rec.why)}</Text>
                  {rec.how.length > 0 && (
                    <View style={{ marginTop: 5 }}>
                      <Text style={[s.bold, { fontSize: 8.5, color: C.ink, marginBottom: 1 }]}>How to fix</Text>
                      {rec.how.map((step, n) => (
                        <View key={step} style={[s.row, { gap: 4, marginTop: 1.5 }]}>
                          <Text style={{ width: 11, color: C.muted }}>{n + 1}.</Text>
                          <Text style={{ flex: 1 }}>{clean(step)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </Section>

        <View style={[s.row, { gap: 10, marginTop: 20 }]} wrap={false}>
          <View style={[s.card, { flex: 1 }]}>
            <Text style={[s.sectionTitle, { fontSize: 11, marginBottom: 6 }]}>What&apos;s missing</Text>
            {report.missing.length ? (
              report.missing.map((item) => (
                <View key={item.id} style={[s.row, { gap: 6, marginTop: 3, alignItems: "center" }]}>
                  <StatusIcon status="fail" size={9} />
                  <Text>{clean(item.title)}</Text>
                </View>
              ))
            ) : (
              <Text style={s.muted}>Nothing essential is missing.</Text>
            )}
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <Text style={[s.sectionTitle, { fontSize: 11, marginBottom: 6 }]}>Tech stack</Text>
            {report.techStack.length ? (
              <View style={[s.row, { flexWrap: "wrap", gap: 4 }]}>
                {report.techStack.map((t) => (
                  <Badge key={t} label={clean(t)} tone="outline" />
                ))}
              </View>
            ) : (
              <Text style={s.muted}>No common technologies detected.</Text>
            )}
          </View>
        </View>

        <Section title="Metrics" keepTogether>
          <View style={[s.row, { flexWrap: "wrap", gap: 8 }]}>
            {tiles.map((t) => (
              <View key={t.label} style={[s.card, { width: "23.8%", padding: 10 }]}>
                <Text style={s.small}>{t.label}</Text>
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: C.ink, marginTop: 3 }}>{t.value}</Text>
                {t.rating && (
                  <View style={[s.row, { marginTop: 4 }]}>
                    <Badge label={t.rating.label} tone={t.rating.tone} />
                  </View>
                )}
              </View>
            ))}
          </View>
        </Section>

        <View break>
          <Section title="All checks" subtitle={`${passed} of ${allChecks.length} checks passed.`} first>
            {categories.map((c) => {
              const cat = report.categories[c];
              const fails = cat.checks.filter((ch) => ch.status === "fail").length;
              return (
                <View key={c} style={{ marginBottom: 14 }}>
                  <View minPresenceAhead={50} style={{ backgroundColor: C.soft, borderRadius: 8, padding: 8, marginBottom: 2 }}>
                    <View style={[s.row, { justifyContent: "space-between", alignItems: "center", marginBottom: 5 }]}>
                      <View style={[s.row, { gap: 6, alignItems: "center" }]}>
                        <Text style={[s.bold, { fontSize: 10.5, color: C.ink }]}>{CATEGORY_LABELS[c]}</Text>
                        {fails > 0 && <Badge label={`${fails} failed`} tone="danger" />}
                      </View>
                      <Text style={[s.bold, { fontSize: 10.5, color: scoreColor(cat.score) }]}>{cat.score}/100</Text>
                    </View>
                    <Bar value={cat.score} color={scoreColor(cat.score)} height={3} />
                  </View>
                  {cat.checks.map((check) => {
                    const details = check.details ?? [];
                    return (
                      <View
                        key={`${c}-${check.id}`}
                        wrap={false}
                        style={[s.row, { gap: 8, paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 0.75, borderColor: C.border }]}
                      >
                        <View style={{ marginTop: 1 }}>
                          <StatusIcon status={check.status} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.ink }}>{clean(check.title)}</Text>
                          {check.value && <Text style={s.small}>{clean(check.value).slice(0, 300)}</Text>}
                          {details.slice(0, 4).map((d) => (
                            <Text key={d} style={[s.small, { color: C.faint }]}>
                              •  {clean(d).slice(0, 160)}
                            </Text>
                          ))}
                          {details.length > 4 && <Text style={[s.small, { color: C.faint }]}>and {details.length - 4} more</Text>}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </Section>
        </View>
        <PageChrome brand={brand} title={title} onlineUrl={onlineUrl} />
      </Page>
    </Document>
  );
}

export function renderReportPdf(report: Report, brand: PdfBrand, createdAt: string, onlineUrl?: string) {
  return renderToBuffer(<ReportDocument report={report} brand={brand} createdAt={createdAt} onlineUrl={onlineUrl} />);
}

export function reportPdfFileName(report: Report) {
  const host = displayUrl(report.finalUrl || report.url).replace(/[^a-z0-9.-]+/gi, "-").slice(0, 60);
  return `${host}-website-report.pdf`;
}
