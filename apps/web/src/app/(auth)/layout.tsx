import { Check } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const POINTS = [
  "Free AI website audits with prioritized fixes",
  "AI text detection with sentence highlights",
  "Writing suggestions and rewrites that keep your meaning",
];

const SCORES = [
  { label: "Performance", value: 94 },
  { label: "SEO", value: 88 },
  { label: "Accessibility", value: 97 },
  { label: "Security", value: 71 },
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r-2 border-[#0b0b0f] bg-[#0b0b0f] p-10 text-white [--ink:#ffffff] lg:flex">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <Logo className="relative" />
        <div className="relative flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm -rotate-2 border-2 border-white bg-white text-[#0b0b0f] shadow-[10px_10px_0_0_#1d6bff]">
            <div className="h-1.5 bg-[#1d6bff]" />
            <div className="flex items-center justify-between border-b-2 border-[#0b0b0f] px-5 py-3">
              <span className="font-black tracking-tight">
                Lucenta<span className="text-[#1d6bff]">.</span>
              </span>
              <span className="border-2 border-[#0b0b0f] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.14em]">AUDIT</span>
            </div>
            <div className="space-y-4 p-5">
              {SCORES.map((s) => (
                <div key={s.label}>
                  <div className="mb-1.5 flex justify-between text-sm font-bold">
                    <span>{s.label}</span>
                    <span className="font-mono">{s.value}</span>
                  </div>
                  <div className="h-3 border-2 border-[#0b0b0f]">
                    <div className="h-full bg-[#1d6bff]" style={{ width: `${s.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="relative space-y-6">
          <h2 className="title-bar text-4xl font-black uppercase leading-tight tracking-tight">Know what&apos;s holding your website and writing back.</h2>
          <ul className="space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[#b9bdc9]">
                <Check className="h-5 w-5 text-[#1d6bff]" /> {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <Logo className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="brutal w-full max-w-md [&_h1]:font-black [&_h1]:uppercase [&_h1]:tracking-tight">
            <div className="h-1.5 bg-primary" />
            <div className="p-6 sm:p-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
