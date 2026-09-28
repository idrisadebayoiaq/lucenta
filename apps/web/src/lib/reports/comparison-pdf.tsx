import "server-only";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { displayUrl, type Gap } from "@/lib/analyzer/compare";
import { CATEGORY_LABELS } from "@/lib/analyzer/types";
import { summarizeComparison, type ComparisonData } from "@/lib/comparisons/data";
import {
  Badge,
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
  type PdfBrand,
} from "./pdf-kit";

function GapCard({ gap, index, site }: { gap: Gap; index: number; site: string }) {
  const rec = gap.recommendation;
  return (
    <View wrap={false} style={[s.card, { marginBottom: 7, borderLeftWidth: 3, borderLeftColor: rec ? IMPACT_COLOR[rec.impact] : C.border }]}>
      <Text style={[s.bold, { fontSize: 10.5, color: C.ink }]}>
        {index + 1}. {clean(rec?.title ?? gap.title)}
      </Text>
      <Text style={[s.small, { marginTop: 2 }]}>
        {clean(gap.aheadOf.join(", "))} {gap.aheadOf.length === 1 ? "passes" : "pass"} this check. {site} {gap.status === "fail" ? "fails" : "has a warning"}.
      </Text>
      <View style={[s.row, { gap: 4, marginTop: 4, flexWrap: "wrap" }]}>
        {rec && <Badge label={`${rec.impact} impact`} tone={IMPACT_TONE[rec.impact]} />}
        {rec && <Badge label={`${rec.effort} fix`} tone={EFFORT_TONE[rec.effort]} />}
        <Badge label={CATEGORY_LABELS[gap.category]} tone="outline" />
      </View>
      {rec && (
        <>
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
        </>
      )}
    </View>
  );
}

function ComparisonDocument({ data, brand, onlineUrl }: { data: ComparisonData; brand: PdfBrand; onlineUrl?: string }) {
  const { available, failed, result, leader, deltas, metrics } = summarizeComparison(data);
  const main = clean(displayUrl(data.siteUrl));
  const rivals = data.sites.length - 1;
  const title = `Competitor comparison · ${main}`;
  const cols = available.length;
  const labelWidth = 130;
  const cell = { width: `${100 / cols}%` };

  return (
    <Document title={title} author={brand.whiteLabel ? clean(brand.name) : "Lucenta"} creator="Lucenta" producer="Lucenta">
      <Page size="A4" style={s.page}>
        <View style={[s.hero, s.row, { alignItems: "center", gap: 18 }]}>
          <View style={{ flex: 1 }}>
            <View style={[s.row, { justifyContent: "space-between", alignItems: "center", marginBottom: 14 }]}>
              <BrandLine brand={brand} inverted size={15} />
              <Text style={{ fontSize: 7.5, color: C.heroMuted, letterSpacing: 1 }}>COMPETITOR COMPARISON</Text>
            </View>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 22, color: "#ffffff", lineHeight: 1.15 }}>{main}</Text>
            <Text style={{ fontSize: 10, color: C.heroMuted, marginTop: 3 }}>
              vs {clean(data.sites.slice(1).map((x) => displayUrl(x.url)).join(", ")) || `${rivals} competitors`}
            </Text>
            <View style={[s.row, { gap: 5, marginTop: 10 }]}>
              <Chip dark>{formatPdfDate(data.createdAt)}</Chip>
              <Chip dark>{data.device === "desktop" ? "Desktop" : "Mobile"}</Chip>
              <Chip dark>{data.sites.length} sites</Chip>
            </View>
          </View>
          {result && (
            <View style={{ alignItems: "center", width: 104 }}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 40, color: result.rank === 1 ? C.amber : "#ffffff", lineHeight: 1 }}>#{result.rank}</Text>
              <Text style={{ fontSize: 9, color: C.heroMuted, marginTop: 4 }}>of {result.total} sites</Text>
            </View>
          )}
        </View>

        {!result && (
          <View style={[s.card, { marginTop: 12, backgroundColor: "#fff1f2", borderColor: "#fecdd3" }]}>
            <Text style={[s.bold, { color: "#e11d48" }]}>This comparison has nothing to compare yet.</Text>
            <Text style={s.muted}>The main site or all competitors couldn&apos;t be analyzed.</Text>
          </View>
        )}

        {result && (
          <>
            <View style={[s.card, { marginTop: 12 }]}>
              <Text style={[s.bold, { fontSize: 12, color: C.ink }]}>
                {result.rank === 1 ? `${main} is ahead of the competition` : `${main} ranks #${result.rank} of ${result.total}`}
              </Text>
              <Text style={[s.muted, { marginTop: 2 }]}>
                {result.gaps.length === 0
                  ? "No competitor passes a check that this site misses."
                  : `${result.gaps.length} check${result.gaps.length === 1 ? "" : "s"} where a competitor does better, ${result.quickWins.length} of them quick wins.`}
                {data.previous ? ` Score changes are since the comparison on ${formatPdfDate(data.previous.createdAt)}.` : ""}
              </Text>
              <View style={[s.row, { gap: 8, marginTop: 12 }]}>
                {available.map((site, i) => (
                  <View
                    key={site.url}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: i === 0 ? C.primary : C.border,
                      backgroundColor: i === 0 ? C.primarySoft : "#ffffff",
                      borderRadius: 10,
                      paddingVertical: 10,
                      paddingHorizontal: 6,
                    }}
                  >
                    <ScoreRing score={site.report.overall.score} size={62} label={`Grade ${site.report.overall.grade}`} />
                    <Text style={[s.bold, { fontSize: 9, color: C.ink, marginTop: 6, textAlign: "center" }]}>{clean(site.label)}</Text>
                    <View style={[s.row, { gap: 3, marginTop: 3, alignItems: "center" }]}>
                      <Text style={s.small}>{i === 0 ? "Main site" : "Competitor"}</Text>
                      {i === leader && <Badge label="Leader" tone="warning" />}
                      {deltas[i] != null && deltas[i] !== 0 && (
                        <Badge label={`${deltas[i]! > 0 ? "+" : ""}${deltas[i]}`} tone={deltas[i]! > 0 ? "success" : "danger"} />
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {failed.length > 0 && (
              <View style={[s.card, { marginTop: 10, backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
                <Text style={[s.bold, { color: "#b45309" }]}>
                  {failed.length} competitor{failed.length === 1 ? "" : "s"} couldn&apos;t be analyzed
                </Text>
                {failed.map((f) => (
                  <Text key={f.url} style={s.muted}>
                    {clean(displayUrl(f.url))}: {clean(f.error)}
                  </Text>
                ))}
              </View>
            )}

            <Section title="Side by side" subtitle="The best result in each row is highlighted in green." keepTogether>
              <View style={[s.card, { padding: 0 }]}>
                <View style={[s.row, { backgroundColor: C.soft, borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingVertical: 7, paddingHorizontal: 10 }]}>
                  <Text style={{ width: labelWidth }} />
                  <View style={[s.row, { flex: 1 }]}>
                    {available.map((site, i) => (
                      <Text key={site.url} style={[s.bold, cell, { textAlign: "right", fontSize: 8.5, color: i === 0 ? C.primary : C.ink }]}>
                        {clean(site.label)}
                      </Text>
                    ))}
                  </View>
                </View>
                {[
                  { label: "Overall", values: result.overall.map(String), best: leader, strong: true },
                  ...result.categories.map((c) => ({ label: CATEGORY_LABELS[c.category], values: c.scores.map(String), best: c.leader, strong: false })),
                  ...metrics.map((row) => ({ label: row.label, values: row.values.map((v) => (v == null ? "–" : row.format(v))), best: row.best, strong: false })),
                ].map((row) => (
                  <View key={row.label} style={[s.row, { paddingVertical: 5, paddingHorizontal: 10, borderTopWidth: 0.75, borderColor: C.border, alignItems: "center" }]}>
                    <Text style={[{ width: labelWidth }, row.strong ? [s.bold, { color: C.ink }] : s.muted]}>{row.label}</Text>
                    <View style={[s.row, { flex: 1 }]}>
                      {row.values.map((v, i) => (
                        <View key={i} style={[cell, { alignItems: "flex-end" }]}>
                          <Text
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 1.5,
                              borderRadius: 8,
                              ...(row.best === i ? { backgroundColor: "#d1fae5" } : {}),
                              color: row.best === i ? "#047857" : C.body,
                              fontFamily: row.best === i || row.strong ? "Helvetica-Bold" : "Helvetica",
                            }}
                          >
                            {v}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
                <View style={[s.row, { paddingVertical: 5, paddingHorizontal: 10, borderTopWidth: 0.75, borderColor: C.border }]}>
                  <Text style={[{ width: labelWidth }, s.muted]}>Tech stack</Text>
                  <View style={[s.row, { flex: 1 }]}>
                    {available.map((site) => (
                      <Text key={site.url} style={[cell, s.small, { textAlign: "right" }]}>
                        {site.report.techStack.length ? clean(site.report.techStack.join(", ")) : "–"}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            </Section>

            <Section title="Quick wins" subtitle="Easy fixes that competitors already have.">
              {result.quickWins.length ? (
                result.quickWins.map((g, i) => <GapCard key={g.key} gap={g} index={i} site={main} />)
              ) : (
                <Text style={s.muted}>No easy gaps. See the full list below for bigger improvements.</Text>
              )}
            </Section>

            <Section title={`Where ${main} is ahead`} subtitle="Checks this site passes that competitors miss.">
              {result.advantages.length ? (
                <View style={s.card}>
                  {result.advantages.map((a) => (
                    <View key={a.key} wrap={false} style={[s.row, { gap: 7, paddingVertical: 3, alignItems: "flex-start" }]}>
                      <View style={{ marginTop: 1 }}>
                        <StatusIcon status="pass" size={10} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.ink }}>{clean(a.title)}</Text>
                        <Text style={s.small}>Missing on {clean(a.behind.join(", "))}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={s.muted}>Competitors pass everything this site passes.</Text>
              )}
            </Section>

            <Section
              title="Where competitors do better"
              subtitle={result.gaps.length ? `${result.gaps.length} checks, ordered by impact and effort.` : "No competitor passes a check that this site misses."}
            >
              {result.gaps.map((g, i) => (
                <GapCard key={g.key} gap={g} index={i} site={main} />
              ))}
            </Section>
          </>
        )}
        <PageChrome brand={brand} title={title} onlineUrl={onlineUrl} />
      </Page>
    </Document>
  );
}

export function renderComparisonPdf(data: ComparisonData, brand: PdfBrand, onlineUrl?: string) {
  return renderToBuffer(<ComparisonDocument data={data} brand={brand} onlineUrl={onlineUrl} />);
}

export function comparisonPdfFileName(data: ComparisonData) {
  const host = displayUrl(data.siteUrl).replace(/[^a-z0-9.-]+/gi, "-").slice(0, 60);
  return `${host}-competitor-comparison.pdf`;
}
