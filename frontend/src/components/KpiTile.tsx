import type { ComponentType } from "react";

import { cn } from "@/lib/cn";

const ACCENTS = {
  brand: { badge: "bg-brand-50 text-brand-700", text: "text-brand-700" },
  emerald: { badge: "bg-emerald-50 text-emerald-700", text: "text-emerald-700" },
  amber: { badge: "bg-amber-50 text-amber-700", text: "text-amber-700" },
  rose: { badge: "bg-rose-50 text-rose-700", text: "text-rose-700" },
  sky: { badge: "bg-sky-50 text-sky-700", text: "text-sky-700" },
} as const;

export type KpiAccent = keyof typeof ACCENTS;

export function KpiTile({
  label,
  value,
  icon: Icon,
  accent = "brand",
  delayMs = 0,
}: {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  accent?: KpiAccent;
  delayMs?: number;
}) {
  const colors = ACCENTS[accent];
  return (
    <div
      className="group animate-kpi-in border border-transparent bg-surface p-2.5 shadow-sm transition-all duration-200 ease-out [clip-path:polygon(10px_0,100%_0,calc(100%-10px)_100%,0_100%)] hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-md"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-transform duration-300 group-hover:scale-110",
            colors.badge,
          )}
        >
          <Icon className="h-3 w-3" />
        </span>
        <span className={cn("truncate text-[10px] font-bold tracking-wide uppercase", colors.text)}>{label}</span>
      </div>
      <p className={cn("mt-1.5 font-mono text-lg font-bold tracking-tight", colors.text)}>{value}</p>
    </div>
  );
}
