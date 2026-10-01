import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full border-2 border-ink bg-card px-3 text-[15px] transition-shadow placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:shadow-brutal-primary disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-[invalid=true]:border-[#e5383b] aria-[invalid=true]:shadow-[4px_4px_0_0_#e5383b]";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldBase, "h-12", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, "py-2 min-h-24 resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(fieldBase, "h-12 pr-8", className)} {...props} />
));
Select.displayName = "Select";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[11px] font-extrabold uppercase leading-none tracking-[0.12em]", className)} {...props} />;
}

export function FieldError({ message }: { message?: string | string[] }) {
  const text = Array.isArray(message) ? message[0] : message;
  if (!text) return null;
  return <p className="text-xs font-semibold text-[#e5383b]">{text}</p>;
}
