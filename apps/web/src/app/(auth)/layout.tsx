import { Check } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const POINTS = [
  "Free AI website audits with prioritized fixes",
  "AI text detection with sentence highlights",
  "Writing suggestions and rewrites that keep your meaning",
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r p-10 lg:flex">
        <Logo />
        <div className="flex flex-1 items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-72 w-72 text-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4.5-4.5" />
          </svg>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">Know what&apos;s holding your website and writing back.</h2>
          <ul className="space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-muted-foreground">
                <Check className="h-5 w-5 text-primary" /> {p}
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
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
