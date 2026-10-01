import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Variant = "default" | "contrast" | "outline" | "ghost" | "secondary" | "destructive" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const raised =
  "border-2 border-ink shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0.5 active:translate-y-0.5 active:shadow-none";

const variants: Record<Variant, string> = {
  default: cn(raised, "bg-primary text-primary-foreground"),
  contrast: cn(raised, "bg-ink text-background shadow-brutal-primary hover:shadow-[6px_6px_0_0_var(--primary)]"),
  outline: cn(raised, "bg-card text-foreground"),
  ghost: "border-2 border-transparent hover:border-ink hover:bg-card",
  secondary: "border-2 border-ink bg-muted hover:bg-accent",
  destructive: cn(raised, "bg-[#e5383b] text-white"),
  link: "text-primary underline-offset-4 hover:underline px-0",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
  icon: "h-9 w-9",
};

export function buttonVariants({ variant = "default", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-extrabold transition-[transform,box-shadow,background-color,border-color] duration-150 cursor-pointer",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button ref={ref} className={buttonVariants({ variant, size, className })} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
