import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// Pagination controls use rounded-lg (not the Button default rounded-md) --
// a documented exception matching the reference app's pagination/filter family.
const navBtnClasses = "rounded-lg shadow-xs";

function pageNumbers(page: number, pageCount: number): (number | "ellipsis")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, pageCount - 1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-hairline bg-surface-alt/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-ink-faint">
        {total === 0 ? "No results" : `${from}–${to} of ${total} results`}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        {onPageSizeChange && (
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-9 appearance-none rounded-lg border border-hairline-strong bg-surface py-1 pr-7 pl-2.5 text-xs font-medium text-ink shadow-xs focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2 text-ink-faint" />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            className={navBtnClasses}
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
            aria-label="First page"
          >
            <ChevronsLeft className="size-3.5" />
          </Button>
          <Button variant="outline" size="sm" className={navBtnClasses} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="size-3.5" />
            Prev
          </Button>

          {pageNumbers(page, pageCount).map((p, i) =>
            p === "ellipsis" ? (
              <span key={`e${i}`} className="px-1 text-xs text-ink-faint">
                …
              </span>
            ) : (
              <Button
                key={p}
                size="sm"
                variant={p === page ? "primary" : "outline"}
                className={cn(navBtnClasses, "min-w-8 px-2")}
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            ),
          )}

          <Button variant="outline" size="sm" className={navBtnClasses} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
            Next
            <ChevronRight className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className={navBtnClasses}
            disabled={page >= pageCount}
            onClick={() => onPageChange(pageCount)}
            aria-label="Last page"
          >
            <ChevronsRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
