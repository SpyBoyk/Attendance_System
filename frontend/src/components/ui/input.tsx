import type { ComponentType, InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

// bg-surface-alt (not bg-surface) so the field reads clearly against a white
// card without depending on a border actually painting along the chamfer's
// diagonal edges -- a plain `border` was proven unreliable there earlier.
const fieldBoxClasses =
  "h-9 w-full bg-surface-alt px-2.5 text-xs text-ink outline-none transition-colors [clip-path:polygon(7px_0,100%_0,calc(100%-7px)_100%,0_100%)] placeholder:text-ink-faint/60 focus:bg-brand-50 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-surface-alt/60 disabled:text-ink-faint";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBoxClasses, className)} {...props} />;
}

export function Select({
  className,
  children,
  icon: Icon,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { icon?: ComponentType<{ className?: string }> }) {
  return (
    <div className={cn("relative", className)}>
      {Icon && <Icon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-faint" />}
      <select
        className={cn(fieldBoxClasses, "w-full appearance-none truncate pr-7", Icon && "pl-8")}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-ink-faint" />
    </div>
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-xs font-semibold text-ink", className)} {...props} />;
}
