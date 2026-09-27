import Link from "next/link";
import { Logo } from "@/components/logo";

const COLUMNS = [
  {
    title: "Tools",
    links: [
      { href: "/tools#website-analyzer", label: "Website Analyzer" },
      { href: "/tools#ai-detector", label: "AI Detector" },
      { href: "/tools#rewriter", label: "Rewriter" },
      { href: "/tools#coming-soon", label: "Coming soon" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Lucenta" },
      { href: "/developers", label: "Hire a developer" },
      { href: "/#free", label: "Free limits" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of Use" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/responsible-use", label: "Responsible Use" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">Audit your website and polish your writing in one place.</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-sm font-bold">{col.title}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t py-6 text-center text-[13px] text-muted-foreground">
        © {new Date().getFullYear()} Lucenta
      </div>
    </footer>
  );
}
