import type { ReactNode } from "react";
import { Fragment } from "react";

import { cn } from "@/lib/cn";

export interface Crumb {
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-0.5">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && (
              <span className="mx-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                <svg viewBox="0 0 24 24" strokeWidth={2.5} className="h-2.5 w-2.5 text-slate-400" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </span>
            )}
            {item.onClick && !isLast ? (
              <button
                onClick={item.onClick}
                title={item.label}
                className="flex min-w-0 max-w-[160px] shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] font-bold text-brand-700 transition hover:bg-slate-100 hover:text-brand-800"
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ) : (
              <span
                title={item.label}
                className={cn(
                  "flex min-w-0 max-w-[220px] items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-[13px]",
                  isLast ? "font-bold text-brand-700" : "font-medium text-slate-500",
                )}
              >
                {item.icon}
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
