import Link from "next/link";
import type { ReactNode } from "react";

export const LEGAL_UPDATED = "September 26, 2026";
export const LEGAL_CONTACT = "adebayoquoreeb@gmail.com";

export type LegalSection = { id: string; title: string; content: ReactNode };

const RELATED = [
  { href: "/terms", label: "Terms of Use" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/responsible-use", label: "Responsible Use" },
];

export function LegalDocument({
  title,
  intro,
  sections,
  current,
}: {
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  current: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-6 text-sm">
            <div className="space-y-1">
              {RELATED.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className={
                    r.href === current
                      ? "block rounded-full bg-muted px-3 py-1.5 font-bold"
                      : "block rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                >
                  {r.label}
                </Link>
              ))}
            </div>
            <div>
              <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">On this page</p>
              <ol className="space-y-1">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="block px-3 py-1 text-muted-foreground hover:text-foreground">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
        </aside>

        <article className="min-w-0 max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {LEGAL_UPDATED}</p>
          <div className="mt-6 text-[15px] leading-relaxed text-foreground/90 [&_p+p]:mt-3">{intro}</div>

          <div
            className={
              "mt-10 space-y-10 text-[15px] leading-relaxed text-foreground/90 " +
              "[&_p+p]:mt-3 [&_p+ul]:mt-3 [&_ul+p]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 " +
              "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-bold [&_h3]:text-foreground " +
              "[&_a]:text-primary [&_a:hover]:underline [&_strong]:text-foreground"
            }
          >
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="mb-3 text-xl font-bold text-foreground">
                  {i + 1}. {s.title}
                </h2>
                {s.content}
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border p-5 text-sm text-muted-foreground">
            Questions about this page? Email us at{" "}
            <a href={`mailto:${LEGAL_CONTACT}`} className="font-bold text-primary hover:underline">
              {LEGAL_CONTACT}
            </a>
            .
          </div>
        </article>
      </div>
    </div>
  );
}
