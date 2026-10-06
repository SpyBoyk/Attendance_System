import type { ButtonHTMLAttributes } from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  // text-xs is fixed here (not per-size) so every button in the app renders
  // at the same font size regardless of its height/padding (sm/md/lg).
  "inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // The app's signature shape: a 7px chamfer cut into the top-left and
        // bottom-right corners, with a brand gradient fill -- used only for
        // the primary call-to-action. Every other variant keeps plain
        // rounded corners so the chamfer stays a deliberate accent, not
        // visual noise repeated everywhere.
        primary:
          "bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-[0_2px_8px_rgb(var(--brand-700)_/_0.35)] [clip-path:polygon(7px_0,100%_0,calc(100%-7px)_100%,0_100%)] hover:from-brand-700 hover:to-brand-900",
        secondary: "rounded-lg bg-brand-50 text-brand-700 shadow-xs hover:bg-brand-100",
        outline: "rounded-lg border border-hairline-strong bg-surface text-ink shadow-xs hover:bg-surface-alt",
        ghost: "rounded-lg text-ink hover:bg-surface-alt",
        destructive: "rounded-lg bg-crit text-white shadow-xs hover:opacity-90",
        navy: "rounded-lg bg-navy-800 text-white shadow-xs hover:bg-navy-700",
      },
      // Every size shares the app's one control height (h-9, matching
      // Input/Select/SearchInput) so buttons line up with each other and
      // with form fields in the same row, regardless of which size a call
      // site picks.
      size: {
        sm: "h-9 px-4",
        md: "h-9 px-4",
        lg: "h-9 px-4",
        "icon-sm": "size-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
