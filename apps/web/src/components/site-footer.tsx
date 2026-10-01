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
      { href: "/freelancers", label: "Hire a freelancer" },
      { href: "/dashboard/freelancer", label: "Become a freelancer" },
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
    <footer className="border-t-2 border-ink bg-[#0b0b0f] text-[#b9bdc9] [--ink:#ffffff]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div className="space-y-3 text-white">
          <Logo />
          <p className="text-sm text-[#b9bdc9]">Audit your website and polish your writing in one place.</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-white">{col.title}</p>
            <ul className="space-y-2 text-sm">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/15 py-6 text-center text-[13px]">
        © {new Date().getFullYear()} Lucenta <span className="text-[#1d6bff]">·</span> free AI website audits, AI detection &amp; writing tools
      </div>
    </footer>
  );
}
